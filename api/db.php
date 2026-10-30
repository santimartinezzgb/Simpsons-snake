<?php
/**
 * Acceso a MongoDB Atlas usando el driver nativo de la extensión `mongodb`.
 */

declare(strict_types=1);

// Evitar acceso web directo a este archivo de utilidades
if (basename($_SERVER['SCRIPT_FILENAME'] ?? '') === basename(__FILE__)) {
    http_response_code(403);
    exit('Forbidden');
}

require_once __DIR__ . '/config.php';

use MongoDB\BSON\UTCDateTime;
use MongoDB\Driver\BulkWrite;
use MongoDB\Driver\Manager;
use MongoDB\Driver\Query;

/**
 * Envía una respuesta JSON con cabeceras de seguridad y termina la ejecución.
 */
function jsonResponse(array $data, int $status = 200): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store, no-cache, must-revalidate');
    header('X-Content-Type-Options: nosniff');
    header('X-Frame-Options: SAMEORIGIN');
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function getManager(): Manager
{
    static $manager = null;

    if (!extension_loaded('mongodb')) {
        throw new RuntimeException('La extensión mongodb de PHP no está instalada.');
    }
    if (MONGODB_URI === '') {
        throw new RuntimeException('Falta MONGODB_URI en el fichero .env.');
    }

    if ($manager === null) {
        $manager = new Manager(MONGODB_URI, [
            'serverSelectionTimeoutMS' => 5000,
            'connectTimeoutMS'         => 5000,
        ]);
    }
    return $manager;
}

function namespaceName(): string
{
    return MONGODB_DB . '.' . MONGODB_COLLECTION;
}

/**
 * Inserta una puntuación.
 */
function insertScore(string $name, int $score, int $time, int $gridSize = 12): void
{
    $bulk = new BulkWrite();
    $bulk->insert([
        'name'      => $name,
        'score'     => $score,
        'time'      => $time,
        'gridSize'  => $gridSize,
        'createdAt' => new UTCDateTime(),
    ]);
    getManager()->executeBulkWrite(namespaceName(), $bulk);
}

/**
 * Devuelve el TOP N para un tamaño de tablero (o global si es null).
 */
function getTopScores(?int $gridSize = null, int $limit = TOP_LIMIT): array
{
    $filter = [];
    if ($gridSize !== null) {
        $filter = ($gridSize === 12)
            ? ['$or' => [['gridSize' => 12], ['gridSize' => ['$exists' => false]]]]
            : ['gridSize' => $gridSize];
    }

    $query = new Query($filter, [
        'sort'       => ['score' => -1, 'time' => 1, 'createdAt' => 1],
        'limit'      => $limit,
        'projection' => ['_id' => 0, 'name' => 1, 'score' => 1, 'time' => 1, 'gridSize' => 1, 'createdAt' => 1],
    ]);

    $cursor = getManager()->executeQuery(namespaceName(), $query);

    $result = [];
    foreach ($cursor as $doc) {
        $result[] = [
            'name'      => (string) $doc->name,
            'score'     => (int) $doc->score,
            'time'      => (int) $doc->time,
            'gridSize'  => (int) ($doc->gridSize ?? 12),
            'createdAt' => isset($doc->createdAt)
                ? $doc->createdAt->toDateTime()->format(DATE_ATOM)
                : null,
        ];
    }
    return $result;
}

/**
 * Devuelve los rankings TOP 5 de los 3 tableros (8x8, 12x12, 16x16).
 */
function getAllRankings(int $limit = TOP_LIMIT): array
{
    return [
        '8'  => getTopScores(8, $limit),
        '12' => getTopScores(12, $limit),
        '16' => getTopScores(16, $limit),
    ];
}

/**
 * Indica si una puntuación entraría en el TOP N actual de un tablero.
 * Debe SUPERAR al último clasificado: más puntos o, a igualdad, menos tiempo.
 */
function qualifiesForTop(int $score, int $time, int $gridSize = 12, int $limit = TOP_LIMIT): bool
{
    if ($score <= 0) {
        return false;
    }

    $top = getTopScores($gridSize, $limit);
    if (count($top) < $limit) {
        return true;
    }

    $last = $top[$limit - 1];
    return $score > $last['score'] || ($score === $last['score'] && $time < $last['time']);
}

/**
 * Mantiene en la colección solo las N mejores partidas por tablero.
 */
function pruneScores(?int $gridSize = null, int $limit = TOP_LIMIT): int
{
    $sizes = $gridSize ? [$gridSize] : [8, 12, 16];
    $totalDeleted = 0;

    foreach ($sizes as $size) {
        $filter = ($size === 12)
            ? ['$or' => [['gridSize' => 12], ['gridSize' => ['$exists' => false]]]]
            : ['gridSize' => $size];

        $query = new Query($filter, [
            'sort'       => ['score' => -1, 'time' => 1, 'createdAt' => 1],
            'limit'      => $limit,
            'projection' => ['_id' => 1],
        ]);

        $keepIds = [];
        foreach (getManager()->executeQuery(namespaceName(), $query) as $doc) {
            $keepIds[] = $doc->_id;
        }

        $deleteFilter = ($size === 12)
            ? ['$or' => [['gridSize' => 12], ['gridSize' => ['$exists' => false]]], '_id' => ['$nin' => $keepIds]]
            : ['gridSize' => $size, '_id' => ['$nin' => $keepIds]];

        $bulk = new BulkWrite();
        $bulk->delete($deleteFilter, ['limit' => 0]);
        $res = getManager()->executeBulkWrite(namespaceName(), $bulk);
        $totalDeleted += (int) $res->getDeletedCount();
    }

    return $totalDeleted;
}

/**
 * Comprueba si ya existe una partida guardada con ese nombre en un tablero específico.
 */
function nameExists(string $name, ?int $gridSize = null): bool
{
    // Búsqueda insensible a mayúsculas
    $regex = new MongoDB\BSON\Regex('^' . preg_quote($name, '/') . '$', 'i');
    $filter = ['name' => $regex];
    if ($gridSize !== null) {
        if ($gridSize === 12) {
            $filter['$or'] = [['gridSize' => 12], ['gridSize' => ['$exists' => false]]];
        } else {
            $filter['gridSize'] = $gridSize;
        }
    }
    $query = new Query($filter, ['limit' => 1, 'projection' => ['_id' => 1]]);
    $cursor = getManager()->executeQuery(namespaceName(), $query);
    return !empty($cursor->toArray());
}
