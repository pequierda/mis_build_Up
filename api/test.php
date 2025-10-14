<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

try {
    require_once __DIR__ . '/../config/upstash.php';
    $redis = new UpstashRedis();
    
    // Test basic connectivity
    $testKey = 'test:connection';
    $redis->set($testKey, 'working');
    $result = $redis->get($testKey);
    
    echo json_encode([
        'success' => true,
        'message' => 'Connection successful',
        'test_result' => $result,
        'admin_username' => $redis->get('admin:username'),
        'admin_password' => $redis->get('admin:password')
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Connection failed: ' . $e->getMessage()
    ]);
}
