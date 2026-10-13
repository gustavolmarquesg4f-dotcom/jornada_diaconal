<?php
declare(strict_types=1);
final class Db {
  public static function connect(): PDO {
    $url=(string)getenv('DATABASE_URL');
    $p=parse_url($url);
    if(!$p || empty($p['host']) || empty($p['path'])) throw new RuntimeException('DATABASE_URL inválida');
    $host=$p['host']; $port=(int)($p['port']??5432);
    $db=substr($p['path'],1);$user=rawurldecode($p['user']??'');$password=rawurldecode($p['pass']??'');
    $dsn="pgsql:host={$host};port={$port};dbname={$db};connect_timeout=5";
    return new PDO($dsn,$user,$password,[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC,PDO::ATTR_EMULATE_PREPARES=>false]);
  }
}