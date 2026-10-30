<?php
/**
 * GET    /api/ranking.php → Devuelve el TOP 5 de puntuaciones.
 * DELETE /api/ranking.php → Elimina las partidas sobrantes (fuera del TOP 5)
 *                           y devuelve el TOP 5 resultante.
 */

declare(strict_types=1);

require_once __DIR__ . '/db.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method !== 'GET' && $method !== 'DELETE') {
    header('Allow: GET, DELETE');
    jsonResponse(['ok' => false, 'error' => 'Método no permitido'], 405);
}

try {
    if ($method === 'DELETE') {
        $gridSize = isset($_GET['gridSize']) ? (int) $_GET['gridSize'] : null;
        if ($gridSize !== null && !in_array($gridSize, [8, 12, 16], true)) {
            $gridSize = 12;
        }
        $deleted = pruneScores($gridSize);
        jsonResponse([
            'ok'       => true,
            'deleted'  => $deleted,
            'ranking'  => $gridSize ? getTopScores($gridSize) : getTopScores(12),
            'rankings' => getAllRankings(),
        ]);
    }

    if (isset($_GET['gridSize'])) {
        $gridSize = (int) $_GET['gridSize'];
        if (!in_array($gridSize, [8, 12, 16], true)) {
            $gridSize = 12;
        }
        jsonResponse([
            'ok'       => true,
            'gridSize' => $gridSize,
            'ranking'  => getTopScores($gridSize),
        ]);
    }

    jsonResponse([
        'ok'       => true,
        'ranking'  => getTopScores(12),
        'rankings' => getAllRankings(),
    ]);
} catch (Throwable $e) {
    error_log('[snake] ranking: ' . $e->getMessage());
    jsonResponse(['ok' => false, 'error' => 'No se pudo procesar el ranking'], 500);
}
