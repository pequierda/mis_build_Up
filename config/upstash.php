<?php

class UpstashRedis {
    private $url;
    private $token;

    public function __construct() {
        $this->url = $_ENV['UPSTASH_REDIS_REST_URL'] ?? getenv('UPSTASH_REDIS_REST_URL') ?? '';
        $this->token = $_ENV['UPSTASH_REDIS_REST_TOKEN'] ?? getenv('UPSTASH_REDIS_REST_TOKEN') ?? '';

        if (empty($this->url) || empty($this->token)) {
            throw new Exception('Upstash credentials not configured');
        }
    }

    public function command($command, $args = []) {
        $url = rtrim($this->url, '/') . '/' . $command;
        
        if (!empty($args)) {
            $url .= '/' . implode('/', array_map('urlencode', $args));
        }

        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => [
                'Authorization: Bearer ' . $this->token,
                'Content-Type: application/json'
            ],
            CURLOPT_TIMEOUT => 10
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode !== 200) {
            throw new Exception('Upstash request failed with status ' . $httpCode);
        }

        return json_decode($response, true);
    }

    public function get($key) {
        $result = $this->command('GET', [$key]);
        return $result['result'] ?? null;
    }

    public function set($key, $value) {
        return $this->command('SET', [$key, $value]);
    }

    public function hget($key, $field) {
        $result = $this->command('HGET', [$key, $field]);
        return $result['result'] ?? null;
    }

    public function hset($key, $field, $value) {
        return $this->command('HSET', [$key, $field, $value]);
    }

    public function hgetall($key) {
        $result = $this->command('HGETALL', [$key]);
        $data = $result['result'] ?? [];
        
        $formatted = [];
        for ($i = 0; $i < count($data); $i += 2) {
            if (isset($data[$i + 1])) {
                $formatted[$data[$i]] = $data[$i + 1];
            }
        }
        return $formatted;
    }

    public function incr($key) {
        $result = $this->command('INCR', [$key]);
        return $result['result'] ?? null;
    }

    public function incrby($key, $increment) {
        $result = $this->command('INCRBY', [$key, $increment]);
        return $result['result'] ?? null;
    }

    public function exists($key) {
        $result = $this->command('EXISTS', [$key]);
        return ($result['result'] ?? 0) > 0;
    }
}

