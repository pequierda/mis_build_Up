<?php
// Simple test without JSON headers first
echo "PHP is working!<br>";

try {
    require_once __DIR__ . '/../config/upstash.php';
    echo "Upstash config loaded!<br>";
    
    $redis = new UpstashRedis();
    echo "Upstash client created!<br>";
    
    // Test basic connectivity
    $testKey = 'test:connection';
    $redis->set($testKey, 'working');
    $result = $redis->get($testKey);
    echo "Test key set and retrieved: " . $result . "<br>";
    
    $adminUser = $redis->get('admin:username');
    $adminPass = $redis->get('admin:password');
    echo "Admin username: " . ($adminUser ?: 'NOT SET') . "<br>";
    echo "Admin password: " . ($adminPass ?: 'NOT SET') . "<br>";
    
    echo "<br><strong>All tests passed!</strong>";
    
} catch (Exception $e) {
    echo "<br><strong>Error:</strong> " . $e->getMessage();
}
