<?php
session_start();
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once __DIR__ . '/../../config/upstash.php';

function isAdminLoggedIn() {
    return isset($_SESSION['admin_logged_in']) && $_SESSION['admin_logged_in'] === true;
}

try {
    $redis = new UpstashRedis();
    $method = $_SERVER['REQUEST_METHOD'];

    if ($method === 'GET') {
        $services = $redis->get('services_list');
        
        if ($services) {
            echo $services;
        } else {
            echo json_encode([]);
        }
    } elseif (in_array($method, ['POST', 'PUT', 'DELETE'])) {
        if (!isAdminLoggedIn()) {
            http_response_code(401);
            echo json_encode([
                'success' => false,
                'message' => 'Unauthorized. Please login.'
            ]);
            exit;
        }

        $input = json_decode(file_get_contents('php://input'), true);

        if ($method === 'POST' || $method === 'PUT') {
            $service = [
                'id' => $input['id'] ?? uniqid('service_'),
                'title' => $input['title'] ?? '',
                'description' => $input['description'] ?? '',
                'color' => $input['color'] ?? 'text-blue-600',
                'icon' => $input['icon'] ?? '',
                'image' => $input['image'] ?? null
            ];

            if (empty($service['title']) || empty($service['description'])) {
                throw new Exception('Title and description are required');
            }

            $servicesJson = $redis->get('services_list');
            $services = $servicesJson ? json_decode($servicesJson, true) : [];

            $index = array_search($service['id'], array_column($services, 'id'));
            
            if ($index !== false) {
                $services[$index] = $service;
            } else {
                $services[] = $service;
            }

            $redis->set('services_list', json_encode($services));

            echo json_encode([
                'success' => true,
                'message' => 'Service saved successfully',
                'service' => $service
            ]);
        } elseif ($method === 'DELETE') {
            $serviceId = $input['id'] ?? '';
            
            if (empty($serviceId)) {
                throw new Exception('Service ID is required');
            }

            $servicesJson = $redis->get('services_list');
            $services = $servicesJson ? json_decode($servicesJson, true) : [];

            $services = array_filter($services, function($s) use ($serviceId) {
                return $s['id'] !== $serviceId;
            });

            $services = array_values($services);

            $redis->set('services_list', json_encode($services));

            echo json_encode([
                'success' => true,
                'message' => 'Service deleted successfully'
            ]);
        }
    }
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}

