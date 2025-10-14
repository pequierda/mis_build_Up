<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once __DIR__ . '/../config/upstash.php';

try {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($input['service_id']) || !isset($input['rating'])) {
        throw new Exception('Missing required fields: service_id and rating');
    }

    $serviceId = $input['service_id'];
    $rating = intval($input['rating']);

    if ($rating < 1 || $rating > 5) {
        throw new Exception('Rating must be between 1 and 5');
    }

    $validServices = [
        'cloud-solutions',
        'cybersecurity',
        'web-development',
        'data-analytics',
        'ai-ml',
        'it-consulting'
    ];

    if (!in_array($serviceId, $validServices)) {
        throw new Exception('Invalid service ID');
    }

    $redis = new UpstashRedis();

    $totalKey = "service:{$serviceId}:total";
    $countKey = "service:{$serviceId}:count";

    $redis->incrby($totalKey, $rating);
    $redis->incr($countKey);

    $total = intval($redis->get($totalKey) ?? 0);
    $count = intval($redis->get($countKey) ?? 0);
    $average = $count > 0 ? $total / $count : 0;

    echo json_encode([
        'success' => true,
        'message' => 'Rating submitted successfully',
        'data' => [
            'service_id' => $serviceId,
            'average' => round($average, 2),
            'count' => $count
        ]
    ]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}

