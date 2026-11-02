<?php
header('Content-Type: text/plain; charset=utf-8');
header('Cache-Control: no-store');

function ok_cc($v) {
    $v = strtoupper(trim((string) $v));
    return preg_match('/^[A-Z]{2}$/', $v) ? $v : '';
}

function visitor_ip() {
    $ip = $_SERVER['REMOTE_ADDR'] ?? '';
    if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) {
        return $ip;
    }
    $fwd = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? '';
    $ip = trim(explode(',', $fwd)[0]);
    if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) {
        return $ip;
    }
    return '';
}

function http_get($url) {
    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 2,
            CURLOPT_CONNECTTIMEOUT => 2,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_USERAGENT => '4speach-geo',
        ]);
        $out = curl_exec($ch);
        curl_close($ch);
        return $out === false ? '' : (string) $out;
    }
    $ctx = stream_context_create([
        'http' => ['timeout' => 2, 'header' => "User-Agent: 4speach-geo\r\n"],
        'ssl' => ['verify_peer' => true, 'verify_peer_name' => true],
    ]);
    $out = @file_get_contents($url, false, $ctx);
    return $out === false ? '' : (string) $out;
}

$cc = '';
foreach (['GEOIP_COUNTRY_CODE', 'GEOIP_COUNTRY_CODE_V6', 'MM_COUNTRY_CODE',
          'HTTP_CF_IPCOUNTRY', 'HTTP_X_COUNTRY_CODE', 'HTTP_GEOIP_COUNTRY_CODE',
          'HTTP_X_GEO_COUNTRY', 'HTTP_CLOUDFRONT_VIEWER_COUNTRY'] as $k) {
    if (!empty($_SERVER[$k])) {
        $cc = ok_cc($_SERVER[$k]);
        if ($cc !== '' && $cc !== 'XX' && $cc !== 'T1') break;
        $cc = '';
    }
}

$ip = visitor_ip();
if ($cc === '' && $ip !== '' && function_exists('geoip_country_code_by_name')) {
    $cc = ok_cc(@geoip_country_code_by_name($ip));
}
if ($cc === '' && $ip !== '') {
    $raw = http_get('https://get.geojs.io/v1/ip/country/' . rawurlencode($ip));
    $cc = ok_cc($raw);
}
if ($cc === '' && $ip !== '') {
    $raw = http_get('https://ipwho.is/' . rawurlencode($ip) . '?fields=country_code,success');
    $j = json_decode($raw, true);
    if (is_array($j) && !empty($j['success'])) {
        $cc = ok_cc($j['country_code'] ?? '');
    }
}

echo $cc;
