<?php
/**
 * Router para el servidor integrado de PHP (desarrollo):
 *   Levantar servidor: php -S localhost:8080 router.php
 *
 * Bloquea el acceso a ficheros ocultos (.env, .git...), scripts internos
 * (db.php, config.php, router.php) y documentación de desarrollo.
 */

declare(strict_types=1);

$rawPath = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?? '/';
$path = rawurldecode($rawPath);
$basename = basename($path);

// Bloquear ficheros ocultos (.env, .git...) o cualquier intento de path traversal
if (
    str_starts_with($basename, '.') ||
    preg_match('#(^|/)\.#', $path) ||
    in_array($basename, ['router.php', 'db.php', 'config.php', 'instrucciones.md', 'README.md'], true)
) {
    http_response_code(403);
    header('Content-Type: text/plain; charset=utf-8');
    echo 'Forbidden';
    return true;
}

return false; // Servir el fichero estático o endpoint solicitado normalmente

