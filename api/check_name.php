<?php
/**
 * GET /api/check_name.php?name=...
 * Comprueba si un nombre de jugador ya está en uso en toda la base de datos.
 */

declare(strict_types=1);

require_once __DIR__ . '/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    jsonResponse(['ok' => false, 'error' => 'Método no permitido'], 405);
}

$name = trim((string) ($_GET['name'] ?? ''));
$name = strip_tags($name);
$name = preg_replace('/\s+/u', ' ', $name);
$name = preg_replace('/[\x00-\x1F\x7F]/u', '', $name);

$gridSize = isset($_GET['gridSize']) ? (int) $_GET['gridSize'] : null;
if ($gridSize !== null && !in_array($gridSize, [8, 12, 16], true)) {
    $gridSize = 12;
}

if ($name === '' || mb_strlen($name) > MAX_NAME_LENGTH) {
    jsonResponse(['ok' => true, 'exists' => false]);
}

try {
    $exists = nameExists($name, $gridSize);
    jsonResponse(['ok' => true, 'exists' => $exists]);
} catch (Throwable $e) {
    error_log('[snake] check_name: ' . $e->getMessage());
    jsonResponse(['ok' => false, 'error' => 'Error al comprobar nombre'], 500);
}
