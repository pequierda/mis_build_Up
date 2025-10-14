<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');

require_once __DIR__ . '/../config/upstash.php';

try {
    $services = [
        'cloud-solutions',
        'cybersecurity',
        'web-development',
        'data-analytics',
        'ai-ml',
        'it-consulting'
    ];

    $redis = new UpstashRedis();
    $ratings = [];

    foreach ($services as $serviceId) {
        $totalKey = "service:{$serviceId}:total";
        $countKey = "service:{$serviceId}:count";

        $total = intval($redis->get($totalKey) ?? 0);
        $count = intval($redis->get($countKey) ?? 0);
        
        $ratings[$serviceId] = [
            'average' => $count > 0 ? round($total / $count, 2) : 0,
            'count' => $count
        ];
    }

    echo json_encode($ratings);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'error' => $e->getMessage()
    ]);
}

