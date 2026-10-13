<?php
declare(strict_types=1);
require __DIR__.'/../src/Db.php';
$email = strtolower(trim((string)getenv('ADMIN_EMAIL')));
$name = trim((string)(getenv('ADMIN_NAME') ?: 'Administrador do Diaconato'));
$password = (string)getenv('ADMIN_PASSWORD');
if (!filter_var($email,FILTER_VALIDATE_EMAIL) || strlen($password)<12) {
    fwrite(STDERR,"Defina ADMIN_EMAIL e ADMIN_PASSWORD (12+ caracteres) no ambiente.\n"); exit(1);
}
$db=Db::connect();
$q=$db->prepare("INSERT INTO users(name,email,password_hash,role) VALUES(:name,:email,:hash,'admin') ON CONFLICT(email) DO NOTHING");
$q->execute(['name'=>$name,'email'=>$email,'hash'=>password_hash($password,PASSWORD_DEFAULT)]);
echo $q->rowCount() ? "Administrador criado.\n" : "Email existente: nenhuma alteração feita.\n";