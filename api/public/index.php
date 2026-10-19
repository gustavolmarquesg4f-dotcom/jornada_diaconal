<?php
declare(strict_types=1);
require __DIR__.'/../src/Db.php';
function respond(array $data,int $status=200): never {http_response_code($status);header('Content-Type: application/json; charset=utf-8');header('Cache-Control: no-store');echo json_encode($data,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);exit;}
function input(): array {$r=file_get_contents('php://input');$v=json_decode($r?:'{}',true);if(!is_array($v))respond(['error'=>'JSON inválido'],400);return $v;}
function txt(array $b,string $k,int $max=200,bool $required=true): ?string {$v=trim((string)($b[$k]??''));if($required&&$v==='')respond(['error'=>"Campo obrigatório: $k"],422);if((function_exists('mb_strlen')?mb_strlen($v):strlen($v))>$max)respond(['error'=>"Campo muito longo: $k"],422);return $v?:null;}
function audit(PDO $db,array $u,string $event,?string $id=null):void{$q=$db->prepare('INSERT INTO audit_events(user_id,event,target_id) VALUES(?,?,?)');$q->execute([$u['id'],$event,$id]);}
function auth(PDO $db):array{
 $raw=(string)(($_SERVER['HTTP_AUTHORIZATION']??($_SERVER['REDIRECT_HTTP_AUTHORIZATION']??'')));if(!preg_match('/^Bearer ([a-f0-9]{64})$/i',$raw,$m))respond(['error'=>'Acesso não autorizado'],401);
 $q=$db->prepare("SELECT u.id,u.name,u.email,u.role,u.active FROM auth_tokens t JOIN users u ON u.id=t.user_id WHERE t.token_hash=? AND t.expires_at>now() AND u.active=true LIMIT 1");$q->execute([hash('sha256',$m[1])]);$u=$q->fetch();if(!$u)respond(['error'=>'Sessão expirada'],401);return $u;
}
function requireRole(array $u,array $roles):void{if(!in_array($u['role'],$roles,true))respond(['error'=>'Sem permissão'],403);}
function fetchAll(PDO $db,string $sql,array $v=[]):array{$q=$db->prepare($sql);$q->execute($v);return $q->fetchAll();}
function canViewDeacon(PDO $db,array $u,string $did):void {
 if($u['role']!=='leader')return;
 $q=$db->prepare('SELECT 1 FROM group_members gm JOIN care_groups g ON g.id=gm.group_id WHERE gm.deacon_id=? AND g.leader_id=? AND g.active=true');$q->execute([$did,$u['id']]);if(!$q->fetchColumn())respond(['error'=>'Diácono fora de seus grupos'],403);
}
function validUuid(string $id):void{if(!preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i',$id))respond(['error'=>'Identificador inválido'],400);}
$origin=(string)($_SERVER['HTTP_ORIGIN']??'');$allowed=array_map('trim',explode(',',(string)getenv('ALLOWED_ORIGINS')));
if($origin!==''&&in_array($origin,$allowed,true)){header('Access-Control-Allow-Origin: '.$origin);header('Vary: Origin');header('Access-Control-Allow-Headers: Content-Type, Authorization');header('Access-Control-Allow-Methods: GET, POST, PATCH, DELETE, OPTIONS');}
elseif($origin!==''){respond(['error'=>'Origem não autorizada'],403);}
if(($_SERVER['REQUEST_METHOD']??'')==='OPTIONS'){http_response_code(204);exit;}
$path=parse_url($_SERVER['REQUEST_URI']??'/',PHP_URL_PATH);$method=$_SERVER['REQUEST_METHOD']??'GET';
if($method==='GET'&&$path==='/health')respond(['ok'=>true,'service'=>'diaconato-api','version'=>'0.1.0']);
try {
 $db=Db::connect();
 if($method==='POST'&&$path==='/auth/login'){
  $b=input();$email=strtolower(trim((string)($b['email']??'')));$pwd=(string)($b['password']??'');
  // Login sempre retorna erro genérico; um limitador por IP deve ser configurado na hospedagem.
  if(!filter_var($email,FILTER_VALIDATE_EMAIL)||strlen($pwd)<1)respond(['error'=>'Credenciais inválidas'],401);
  $clientIp=(string)($_SERVER['REMOTE_ADDR']??'unknown');
  $fingerprint=hash('sha256',$email.'|'.$clientIp);
  $q=$db->prepare("SELECT COUNT(*) FROM login_attempts WHERE fingerprint=? AND created_at>now()-interval '15 minutes'");$q->execute([$fingerprint]);
  if((int)$q->fetchColumn()>=5)respond(['error'=>'Muitas tentativas. Aguarde 15 minutos.'],429);
  $q=$db->prepare('SELECT id,name,email,role,password_hash FROM users WHERE email=? AND active=true');$q->execute([$email]);$u=$q->fetch();
  if(!$u||!password_verify($pwd,$u['password_hash'])){
    $db->prepare('INSERT INTO login_attempts(fingerprint) VALUES(?)')->execute([$fingerprint]);respond(['error'=>'Credenciais inválidas'],401);
  }
  $db->prepare('DELETE FROM login_attempts WHERE fingerprint=?')->execute([$fingerprint]);
  $raw=bin2hex(random_bytes(32));$db->prepare("INSERT INTO auth_tokens(user_id,token_hash,expires_at) VALUES(?,?,now()+interval '8 hours')")->execute([$u['id'],hash('sha256',$raw)]);
  unset($u['password_hash']);respond(['token'=>$raw,'user'=>$u,'expires_in'=>28800]);
 }
 $u=auth($db);
 if($method==='GET'&&$path==='/auth/me')respond(['user'=>$u]);
 if($method==='POST'&&$path==='/auth/logout'){
  $raw=substr((string)(($_SERVER['HTTP_AUTHORIZATION']??($_SERVER['REDIRECT_HTTP_AUTHORIZATION']??''))),7);$db->prepare('DELETE FROM auth_tokens WHERE token_hash=?')->execute([hash('sha256',$raw)]);respond(['ok'=>true]);
 }
 if($method==='GET'&&$path==='/dashboard'){
  $scope=$u['role']==='leader'?' AND g.leader_id=:user_id':'';
  $params=$u['role']==='leader'?['user_id'=>$u['id']]:[];
  $all=fetchAll($db,"SELECT d.id,d.status,gm.group_id,MAX(f.contacted_at) AS last_contact FROM deacons d LEFT JOIN group_members gm ON gm.deacon_id=d.id LEFT JOIN care_groups g ON g.id=gm.group_id LEFT JOIN followups f ON f.deacon_id=d.id WHERE 1=1 ".($u['role']==='leader'?' AND g.leader_id=:user_id':'')." GROUP BY d.id,gm.group_id",$params);
  $count=count($all);$without=count(array_filter($all,fn($d)=>empty($d['group_id'])));
  $stale=count(array_filter($all,fn($d)=>$d['status']==='active'&&(!$d['last_contact']||strtotime($d['last_contact'])<strtotime('-30 days'))));
  $fresh=count(array_filter($all,fn($d)=>$d['last_contact']&&strtotime($d['last_contact'])>=strtotime('-30 days')));
  $groups=fetchAll($db,"SELECT g.id,g.name,g.target_size,u.name leader,COUNT(gm.deacon_id)::int AS members FROM care_groups g LEFT JOIN users u ON g.leader_id=u.id LEFT JOIN group_members gm ON gm.group_id=g.id WHERE g.active=true".($u['role']==='leader'?' AND g.leader_id=:user_id':'')." GROUP BY g.id,u.name ORDER BY g.name",$params);
  respond(['totals'=>['deacons'=>$count,'without_group'=>$without,'contacted_30_days'=>$fresh,'without_recent_contact'=>$stale],'groups'=>$groups]);
 }
 if($method==='GET'&&$path==='/users'){requireRole($u,['admin','coordinator']);respond(['items'=>fetchAll($db,"SELECT id,name,email,role,active FROM users WHERE active=true ORDER BY name")]);}
 if($method==='POST'&&$path==='/users'){
  requireRole($u,['admin']);$b=input();$role=txt($b,'role',16);if(!in_array($role,['admin','coordinator','leader']))respond(['error'=>'Perfil inválido'],422);
  $pass=(string)($b['password']??'');if(strlen($pass)<12)respond(['error'=>'Senha precisa ter pelo menos 12 caracteres'],422);
  $email=strtolower((string)txt($b,'email',180));if(!filter_var($email,FILTER_VALIDATE_EMAIL))respond(['error'=>'Email inválido'],422);
  $q=$db->prepare('INSERT INTO users(name,email,password_hash,role) VALUES(?,?,?,?) RETURNING id,name,email,role');$q->execute([txt($b,'name',160),$email,password_hash($pass,PASSWORD_DEFAULT),$role]);$row=$q->fetch();audit($db,$u,'user.create',$row['id']);respond(['item'=>$row],201);
 }
 if($method==='GET'&&$path==='/deacons'){
  $where=$u['role']==='leader'?'WHERE g.leader_id=:user_id':'';$params=$u['role']==='leader'?['user_id'=>$u['id']]:[];
  $rows=fetchAll($db,"SELECT d.id,d.full_name,d.cohort,d.status,d.phone,d.email,d.availability,d.started_at,gm.group_id,g.name group_name,MAX(f.contacted_at) last_contact FROM deacons d LEFT JOIN group_members gm ON gm.deacon_id=d.id LEFT JOIN care_groups g ON g.id=gm.group_id LEFT JOIN followups f ON f.deacon_id=d.id $where GROUP BY d.id,gm.group_id,g.name ORDER BY d.full_name LIMIT 1000",$params);respond(['items'=>$rows]);
 }
 if($method==='POST'&&$path==='/deacons'){
  requireRole($u,['admin','coordinator']);$b=input();$cohort=txt($b,'cohort',10);$status=$b['status']??'active';if(!in_array($cohort,['antigo','novo'])||!in_array($status,['active','away','inactive']))respond(['error'=>'Tipo ou situação inválidos'],422);
  $email=txt($b,'email',180,false);if($email&&!filter_var($email,FILTER_VALIDATE_EMAIL))respond(['error'=>'Email inválido'],422);
  $q=$db->prepare('INSERT INTO deacons(full_name,cohort,status,phone,email,availability) VALUES(?,?,?,?,?,?) RETURNING id');$q->execute([txt($b,'full_name',180),$cohort,$status,txt($b,'phone',30,false),$email,txt($b,'availability',1000,false)]);$id=$q->fetchColumn();audit($db,$u,'deacon.create',$id);respond(['id'=>$id],201);
 }
 if(preg_match('~^/deacons/([0-9a-f-]{36})$~i',(string)$path,$m)&&$method==='PATCH'){
  requireRole($u,['admin','coordinator']);$id=$m[1];validUuid($id);$b=input();$fields=[];$values=[];
  foreach(['full_name'=>180,'phone'=>30,'email'=>180,'availability'=>1000] as $name=>$len){if(array_key_exists($name,$b)){$fields[]="$name=?";$values[]=txt($b,$name,$len,$name==='full_name');}}
  if(array_key_exists('status',$b)){if(!in_array($b['status'],['active','away','inactive']))respond(['error'=>'Situação inválida'],422);$fields[]='status=?';$values[]=$b['status'];}
  if(!$fields)respond(['error'=>'Nenhuma alteração enviada'],422);$values[]=$id;$q=$db->prepare('UPDATE deacons SET '.implode(',',$fields).',updated_at=now() WHERE id=?');$q->execute($values);if(!$q->rowCount())respond(['error'=>'Não encontrado'],404);audit($db,$u,'deacon.update',$id);respond(['ok'=>true]);
 }
 if($method==='GET'&&$path==='/groups'){
  $params=$u['role']==='leader'?['user_id'=>$u['id']]:[];$where=$u['role']==='leader'?'WHERE g.leader_id=:user_id':'';
  respond(['items'=>fetchAll($db,"SELECT g.id,g.name,g.target_size,g.leader_id,u.name leader_name,COUNT(gm.deacon_id)::int members FROM care_groups g LEFT JOIN users u ON g.leader_id=u.id LEFT JOIN group_members gm ON gm.group_id=g.id $where GROUP BY g.id,u.name ORDER BY g.name",$params)]);
 }
 if($method==='POST'&&$path==='/groups'){
  requireRole($u,['admin','coordinator']);$b=input();$target=(int)($b['target_size']??10);if($target<1||$target>30)respond(['error'=>'Capacidade inválida'],422);$leader=$b['leader_id']??null;
  if($leader){validUuid((string)$leader);$q=$db->prepare("SELECT 1 FROM users WHERE id=? AND role='leader' AND active=true");$q->execute([$leader]);if(!$q->fetchColumn())respond(['error'=>'Responsável inválido'],422);}
  $q=$db->prepare('INSERT INTO care_groups(name,target_size,leader_id) VALUES(?,?,?) RETURNING id');$q->execute([txt($b,'name',120),$target,$leader]);$id=$q->fetchColumn();audit($db,$u,'group.create',$id);respond(['id'=>$id],201);
 }
 if(preg_match('~^/groups/([0-9a-f-]{36})$~i',(string)$path,$m)&&$method==='PATCH'){
  requireRole($u,['admin','coordinator']);$id=$m[1];validUuid($id);$b=input();$parts=[];$vals=[];
  if(array_key_exists('name',$b)){$parts[]='name=?';$vals[]=txt($b,'name',120);}
  if(array_key_exists('target_size',$b)){$size=(int)$b['target_size'];if($size<1||$size>30)respond(['error'=>'Capacidade inválida'],422);$parts[]='target_size=?';$vals[]=$size;}
  if(array_key_exists('leader_id',$b)){$leader=$b['leader_id']?:null;
    if($leader){validUuid((string)$leader);$check=$db->prepare("SELECT 1 FROM users WHERE id=? AND role='leader' AND active=true");$check->execute([$leader]);if(!$check->fetchColumn())respond(['error'=>'Responsável inválido'],422);}
    $parts[]='leader_id=?';$vals[]=$leader;
  }
  if(!$parts)respond(['error'=>'Nenhuma alteração enviada'],422);$vals[]=$id;
  $q=$db->prepare('UPDATE care_groups SET '.implode(',',$parts).' WHERE id=?');$q->execute($vals);
  if(!$q->rowCount())respond(['error'=>'Grupo não encontrado'],404);audit($db,$u,'group.update',$id);respond(['ok'=>true]);
 }
 if(preg_match('~^/groups/([0-9a-f-]{36})/members$~i',(string)$path,$m)&&$method==='POST'){
  requireRole($u,['admin','coordinator']);$gid=$m[1];validUuid($gid);$b=input();$did=txt($b,'deacon_id',36);validUuid($did);
  $q=$db->prepare('INSERT INTO group_members(group_id,deacon_id) VALUES(?,?) ON CONFLICT(deacon_id) DO UPDATE SET group_id=EXCLUDED.group_id,joined_at=now()');$q->execute([$gid,$did]);audit($db,$u,'group.assign',$did);respond(['ok'=>true]);
 }
 if($method==='GET'&&$path==='/followups'){
  $did=(string)($_GET['deacon_id']??'');validUuid($did);canViewDeacon($db,$u,$did);
  respond(['items'=>fetchAll($db,"SELECT f.id,f.contacted_at,f.method,f.outcome,f.summary,f.next_contact_on,f.needs_pastoral_attention,u.name author FROM followups f JOIN users u ON u.id=f.author_id WHERE f.deacon_id=? ORDER BY f.contacted_at DESC LIMIT 100",[$did])]);
 }
 if($method==='POST'&&$path==='/followups'){
  $b=input();$did=txt($b,'deacon_id',36);validUuid($did);canViewDeacon($db,$u,$did);
  $methodName=txt($b,'method',20);$outcome=txt($b,'outcome',24);
  if(!in_array($methodName,['presencial','telefone','mensagem','outro'])||!in_array($outcome,['contato_realizado','retornar','sem_resposta','encaminhar']))respond(['error'=>'Tipo ou resultado inválidos'],422);
  $next=$b['next_contact_on']??null;if($next&&!preg_match('/^\d{4}-\d{2}-\d{2}$/',(string)$next))respond(['error'=>'Data inválida'],422);
  $q=$db->prepare('INSERT INTO followups(deacon_id,author_id,method,outcome,summary,next_contact_on,needs_pastoral_attention) VALUES(?,?,?,?,?,?,?) RETURNING id');$q->execute([$did,$u['id'],$methodName,$outcome,txt($b,'summary',1000,false),$next,(bool)($b['needs_pastoral_attention']??false)]);$id=$q->fetchColumn();audit($db,$u,'followup.create',$id);respond(['id'=>$id],201);
 }

 // Discipulados: encontros destinados a todos os diáconos, novos e antigos.
 if($method==='GET'&&$path==='/discipleships'){
  $rows=fetchAll($db,"SELECT m.id,m.title,m.scheduled_at,m.location,m.status,
    (SELECT COUNT(*)::int FROM discipleship_attendance a WHERE a.meeting_id=m.id AND a.status='present') AS present_count,
    (SELECT COUNT(*)::int FROM discipleship_attendance a WHERE a.meeting_id=m.id AND a.status='unable') AS unable_count
    FROM discipleship_meetings m ORDER BY m.scheduled_at DESC LIMIT 100");
  respond(['items'=>$rows]);
 }
 if($method==='POST'&&$path==='/discipleships'){
  requireRole($u,['admin','coordinator']);$b=input();
  $title=txt($b,'title',160);$scheduled=txt($b,'scheduled_at',22);$location=txt($b,'location',180,false);
  $dt=DateTimeImmutable::createFromFormat('!Y-m-d\TH:i',$scheduled,new DateTimeZone('America/Sao_Paulo'));
  if(!$dt||$dt->format('Y-m-d\TH:i')!==$scheduled)respond(['error'=>'Data e hora inválidas'],422);
  $q=$db->prepare('INSERT INTO discipleship_meetings(title,scheduled_at,location,created_by) VALUES(?,?,?,?) RETURNING id');
  $q->execute([$title,$dt->format('c'),$location,$u['id']]);$id=$q->fetchColumn();
  audit($db,$u,'discipleship.create',$id);respond(['id'=>$id],201);
 }
 if(preg_match('~^/discipleships/([0-9a-f-]{36})/attendance$~i',(string)$path,$m)){
  $meetingId=$m[1];validUuid($meetingId);
  $q=$db->prepare('SELECT status FROM discipleship_meetings WHERE id=?');$q->execute([$meetingId]);$meeting=$q->fetch();
  if(!$meeting)respond(['error'=>'Encontro não encontrado'],404);
  if($method==='GET'){
   // Coordenadores visualizam o corpo diaconal; responsáveis apenas seus grupos.
   $scoped=$u['role']==='leader';
   $where=$scoped?' WHERE g.leader_id=:user_id AND g.active=true':'';
   $params=$scoped?['user_id'=>$u['id']]:[];
   $params['meeting_id']=$meetingId;
   $rows=fetchAll($db,"SELECT d.id AS deacon_id,d.full_name,d.cohort,d.status AS deacon_status,
      COALESCE(a.status,'unreported') AS attendance
      FROM deacons d LEFT JOIN group_members gm ON gm.deacon_id=d.id
      LEFT JOIN care_groups g ON g.id=gm.group_id
      LEFT JOIN discipleship_attendance a ON a.deacon_id=d.id AND a.meeting_id=:meeting_id
      $where ORDER BY d.full_name",$params);
   respond(['items'=>$rows]);
  }
  if($method==='POST'){
   $b=input();$did=txt($b,'deacon_id',36);validUuid($did);canViewDeacon($db,$u,$did);
   $status=txt($b,'attendance',16);
   if(!in_array($status,['present','unable','unreported'],true))respond(['error'=>'Situação inválida'],422);
   if($meeting['status']==='cancelled')respond(['error'=>'Encontro cancelado'],422);
   $q=$db->prepare('SELECT 1 FROM deacons WHERE id=?');$q->execute([$did]);
   if(!$q->fetchColumn())respond(['error'=>'Diácono não encontrado'],404);
   if($status==='unreported'){
    $q=$db->prepare('DELETE FROM discipleship_attendance WHERE meeting_id=? AND deacon_id=?');$q->execute([$meetingId,$did]);
   }else{
    $q=$db->prepare("INSERT INTO discipleship_attendance(meeting_id,deacon_id,status,updated_by)
      VALUES(?,?,?,?) ON CONFLICT(meeting_id,deacon_id) DO UPDATE SET
      status=EXCLUDED.status,updated_by=EXCLUDED.updated_by,updated_at=now()");
    $q->execute([$meetingId,$did,$status,$u['id']]);
   }
   audit($db,$u,'discipleship.attendance',$did);respond(['ok'=>true]);
  }
 }
 respond(['error'=>'Rota não encontrada'],404);
} catch(PDOException $e){error_log('Banco: '.$e->getMessage());respond(['error'=>'Não foi possível concluir a operação no banco de dados'],500);} catch(Throwable $e){error_log('Aplicação: '.$e->getMessage());respond(['error'=>'Erro interno'],500);}