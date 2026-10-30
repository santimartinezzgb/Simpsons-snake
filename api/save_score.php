<?php
/**
 * POST /api/save_score.php
 * Body JSON: { "name": string, "score": int, "time": int }
 * Guarda la partida y devuelve el TOP 5 actualizado.
 */

declare(strict_types=1);

require_once __DIR__ . '/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(['ok' => false, 'error' => 'Método no permitido'], 405);
}

$input = json_decode(file_get_contents('php://input') ?: '', true);
if (!is_array($input)) {
    jsonResponse(['ok' => false, 'error' => 'JSON inválido'], 400);
}

// --- Validación ---
$name = trim((string) ($input['name'] ?? ''));
$name = strip_tags($name);
$name = preg_replace('/\s+/u', ' ', $name);          // colapsar espacios
$name = preg_replace('/[\x00-\x1F\x7F]/u', '', $name); // quitar caracteres de control

if ($name === '' || mb_strlen($name) > MAX_NAME_LENGTH) {
    jsonResponse(['ok' => false, 'error' => 'El nombre debe tener entre 1 y ' . MAX_NAME_LENGTH . ' caracteres'], 422);
}

$gridSize = filter_var($input['gridSize'] ?? 12, FILTER_VALIDATE_INT);
if (!in_array($gridSize, [8, 12, 16], true)) {
    $gridSize = 12;
}

$maxScore = $gridSize * $gridSize - 1;
$score = filter_var($input['score'] ?? null, FILTER_VALIDATE_INT, [
    'options' => ['min_range' => 0, 'max_range' => $maxScore],
]);
$time = filter_var($input['time'] ?? null, FILTER_VALIDATE_INT, [
    'options' => ['min_range' => 0, 'max_range' => MAX_TIME],
]);

if ($score === false || $time === false || ($score > 0 && $time < 1)) {
    jsonResponse(['ok' => false, 'error' => 'Puntuación o tiempo no válidos'], 422);
}

// --- Operaciones en Base de Datos ---
try {
    // Comprobar si el nombre ya existe en este tablero
    if (nameExists($name, $gridSize)) {
        jsonResponse(['ok' => false, 'error' => 'El nombre ya está en uso en este tablero. Elige otro nombre.'], 409);
    }

    // Solo se registran partidas que superen al TOP 5 actual de este tablero
    if (!qualifiesForTop($score, $time, $gridSize)) {
        jsonResponse(['ok' => false, 'error' => 'La puntuación no supera al TOP ' . TOP_LIMIT . ' de este tablero.'], 422);
    }

    insertScore($name, $score, $time, $gridSize);
    pruneScores($gridSize); // La base de datos conserva únicamente el TOP 5 de este tablero
    jsonResponse([
        'ok'       => true,
        'gridSize' => $gridSize,
        'ranking'  => getTopScores($gridSize),
        'rankings' => getAllRankings(),
    ]);
} catch (Throwable $e) {
    error_log('[snake] save_score: ' . $e->getMessage());
    jsonResponse(['ok' => false, 'error' => 'No se pudo guardar la puntuación'], 500);
}
