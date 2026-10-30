<?php
/**
 * Configuración de la aplicación.
 * Lee las variables desde el fichero .env de la raíz del proyecto
 * (o desde variables de entorno del sistema si existen).
 */

declare(strict_types=1);

// Evitar acceso web directo a este archivo de configuración
if (basename($_SERVER['SCRIPT_FILENAME'] ?? '') === basename(__FILE__)) {
    http_response_code(403);
    exit('Forbidden');
}

// En producción y APIs nunca mostrar trazas de error al cliente
ini_set('display_errors', '0');
error_reporting(E_ALL);

function loadEnv(string $path): void
{
    if (!is_readable($path)) {
        return;
    }

    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    if ($lines === false) {
        return;
    }

    foreach ($lines as $line) {
        $line = trim($line);
        if ($line === '' || str_starts_with($line, '#') || !str_contains($line, '=')) {
            continue;
        }

        [$key, $value] = array_map('trim', explode('=', $line, 2));
        // Quitar comillas envolventes si las hay
        $value = trim($value, "\"'");

        if (getenv($key) === false) {
            putenv("$key=$value");
            $_ENV[$key] = $value;
        }
    }
}

loadEnv(dirname(__DIR__) . '/.env');

function env(string $key, ?string $default = null): ?string
{
    $value = getenv($key);
    if ($value === false || $value === '') {
        $value = $_ENV[$key] ?? $_SERVER[$key] ?? null;
    }
    return ($value === null || $value === '') ? $default : (string) $value;
}

define('MONGODB_URI', env('MONGODB_URI', ''));
define('MONGODB_DB', env('MONGODB_DB', 'snake'));
define('MONGODB_COLLECTION', env('MONGODB_COLLECTION', 'scores'));

// Límites de validación y configuración del juego
define('MAX_NAME_LENGTH', 20);
define('MAX_SCORE', 16 * 16 - 1); // Cuadrícula máxima: 16x16
define('MAX_TIME', 60 * 60 * 3);  // 3 horas
define('TOP_LIMIT', 5);

