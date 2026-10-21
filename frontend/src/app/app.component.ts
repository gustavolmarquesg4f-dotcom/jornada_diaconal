import { Component, HostListener, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, User, Deacon, RegistryDetails, ObservationEntry, Group, Followup, Dashboard, IntercessionTemplate, IntercessionDraw, IntercessionCandidate, PastoralSlot, PastoralQueueItem, PastoralCareReason, PastoralCareStage, PastoralCarePerson, LeaderWorkspace, WorkspaceMember, MonthlyReport, ReadinessSummary, AuditEvent, AvailabilityProfile } from './api.service';

type Page = 'dashboard'|'workspace'|'reports'|'deacons'|'observations'|'groups'|'leadership'|'intercession'|'pastoral'|'followups'|'settings';
@Component({selector:'app-root',standalone:true,imports:[CommonModule,FormsModule],templateUrl:'./app.component.html'})
export class AppComponent implements OnInit {
 api=inject(ApiService);
 loading=true;busy=false;refreshing=false;showQuickSearch=false;showHelp=false;quickQuery='';error='';notice='';page:Page='dashboard';
 email='';password='';changeOld='';changeNew='';changeNewConfirm='';showChangePassword=false;showMenu=false;showNewDeacon=false;showNewGroup=false;showNewUser=false;showFollowup=false;sidebarCollapsed=false;showPrintPanel=false;printReady=false;printWithPhone=false;
 printSelection:'all'|'antigo'|'novo'='all';printGeneratedAt=new Date();
 dashboard:Dashboard={totals:{deacons:0,without_group:0,contacted_30_days:0,without_recent_contact:0},groups:[]};
 deacons:Deacon[]=[];groups:Group[]=[];users:User[]=[];followups:Followup[]=[];
 workspace:LeaderWorkspace|null=null;workspaceLoading=false;workspaceLoaded=false;workspaceFilter:'due'|'without_contact'|'referrals'='due';
 monthlyReport:MonthlyReport|null=null;reportMonth=new Date().toISOString().slice(0,7);reportLoading=false;reportLoaded=false;
 readiness:ReadinessSummary|null=null;recentAudit:AuditEvent[]=[];auditLoading=false;

 observations:ObservationEntry[]=[];observationsLoading=false;observationsLoaded=false;observationSearch='';observationFilter:'all'|'with'|'without'='all';
 readonly intercessionPosts:{id:'pastores'|'bateria';label:string}[]=[
  {id:'pastores',label:'Porta lateral próxima aos pastores'},
  {id:'bateria',label:'Porta lateral próxima à bateria'}
 ];
 intercessionPostEditor:Record<string,boolean>={};
 intercessionCandidates:Record<string,IntercessionCandidate[]>={};
 intercessionReplacements:Record<string,string>={};
  intercessionTemplates:IntercessionTemplate[]=[];intercessionDraws:IntercessionDraw[]=[];
 intercessionWeekStart='2026-10-26';intercessionCapacity:Record<string,number>={};
 intercessionLoaded=false;intercessionLoading=false;
 pastoralSlots:PastoralSlot[]=[];pastoralLoaded=false;pastoralLoading=false;pastoralWeekStart='2026-10-26';
 pastoralQueue:PastoralQueueItem[]=[];pastoralQueueLoaded=false;pastoralQueueLoading=false;
 pastoralVerifyCandidates:PastoralCarePerson[]=[];pastoralQueueSearch='';
 pastoralNew:{deacon_id:string;priority:number;reason:PastoralCareReason}={
   deacon_id:'',priority:2,reason:'verify_status'
 };
 pastoralQueueDraft:Record<string,{priority:number;reason:PastoralCareReason;stage:PastoralCareStage}>={};

 pastoralDraft:Record<string,{start_time:string;deacon_id:string;status:PastoralSlot['status'];approval_status:PastoralSlot['approval_status']}>={};
  selected:Deacon|null=null;selectedRegistry:RegistryDetails|null=null;registryLoading=false;search='';
 selectedAvailability:AvailabilityProfile|null=null;availabilityLoading=false;
filter:'all'|'antigo'|'novo'|'unassigned'='all';
 draftDeacon={full_name:'',cohort:'antigo',status:'active',phone:'',email:'',availability:''};
 draftGroup={name:'',target_size:10,leader_id:''};
 draftUser={name:'',email:'',password:'',role:'leader'};
 draftFollowup={method:'mensagem',outcome:'contato_realizado',summary:'',next_contact_on:'',needs_pastoral_attention:false};
 get currentUser():User|null{return this.api.user}
 get canManage():boolean{return this.currentUser?.role==='admin'||this.currentUser?.role==='coordinator'}
 get admin():boolean{return this.currentUser?.role==='admin'}

 readonly printCollator=new Intl.Collator('pt-BR',{sensitivity:'base'});
 get printOld():Deacon[]{return this.printPeople('antigo')}
 get printNew():Deacon[]{return this.printPeople('novo')}
 get oldCount():number{return this.deacons.filter(d=>d.cohort==='antigo').length}
 get newCount():number{return this.deacons.filter(d=>d.cohort==='novo').length}
 get pageTitle():string{
  const labels:Record<Page,string>={
   dashboard:'Visão geral',workspace:'Meu Ministério',reports:'Relatórios',deacons:'Diáconos',observations:'Observações',
   groups:'Grupos de cuidado',leadership:'Liderança',intercession:'Intercessão',
   pastoral:'Agenda pastoral',followups:'Acompanhamento',settings:'Usuários e acesso'
  };
  return labels[this.page];
 }
 printPeople(cohort:'antigo'|'novo'):Deacon[]{
  return this.deacons.filter(d=>d.cohort===cohort)
   .slice().sort((x,y)=>this.printCollator.compare(x.full_name,y.full_name));
 }
 openPrintPanel():void{
  this.showPrintPanel=!this.showPrintPanel;
  this.error='';
 }
 printDeacons():void{
  if(!this.deacons.length){this.error='Nenhum cadastro disponível para impressão.';return}
  this.printReady=true;
  this.printGeneratedAt=new Date();
  // Aguarda a atualização do documento de impressão antes de chamar a janela nativa.
  setTimeout(()=>window.print(),120);
 }

 private normalizeSearch(value:string):string{
  return value.toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim();
 }
 get quickResults():Deacon[]{
  const q=this.normalizeSearch(this.quickQuery);
  if(q.length<2)return [];
  const digits=q.replace(/\D/g,'');
  return this.deacons.filter(d=>
   this.normalizeSearch(d.full_name).includes(q)||
   this.normalizeSearch(d.group_name||'').includes(q)||
   (!!digits&&digits.length>=3&&(d.phone||'').replace(/\D/g,'').includes(digits))
  ).slice().sort((a,b)=>this.printCollator.compare(a.full_name,b.full_name)).slice(0,10);
 }
 openQuickSearch():void{
  if(!this.api.authorized||this.showChangePassword)return;
  this.showHelp=false;this.showQuickSearch=true;this.quickQuery='';this.showMenu=false;
  setTimeout(()=>document.getElementById('quick-search-field')?.focus(),0);
 }
 closeQuickSearch():void{this.showQuickSearch=false;this.quickQuery=''}
 openQuickPerson(d:Deacon):void{
  this.closeQuickSearch();this.select(d);window.scrollTo(0,0);
 }
 openFirstQuickResult():void{
  const first=this.quickResults[0];
  if(first)this.openQuickPerson(first);
 }
 @HostListener('document:keydown',['$event'])
 onGlobalKeyDown(event:KeyboardEvent):void{
  if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='k'&&this.api.authorized&&!this.showChangePassword){
   event.preventDefault();this.openQuickSearch();return;
  }
  if(event.key==='Escape'){
   if(this.showQuickSearch){event.preventDefault();this.closeQuickSearch()}
   if(this.showHelp){event.preventDefault();this.showHelp=false}
   if(this.showMenu)this.showMenu=false;
  }
 }
 async refreshCurrentPage():Promise<void>{
  if(this.refreshing||this.busy)return;
  this.refreshing=true;this.notice='';this.error='';
  try{
   await this.reload();
   if(this.error)return;
   if(this.page==='observations'&&this.admin)await this.loadObservations();
   if(this.page==='pastoral'&&this.canManage)await this.loadPastoral();
   if(this.page==='intercession'&&this.canManage)await this.loadIntercession();
   if(this.page==='workspace')await this.loadWorkspace();
   if(this.page==='reports')await this.loadReports();

   if(this.page==='followups'&&this.selected){
     const recent=this.deacons.find(d=>d.id===this.selected?.id);
     if(recent)this.selected=recent;
     await this.fetchFollowups();
     if(this.selected)await this.loadAvailability(this.selected.id);
   }
   if(!this.error)this.notice='Informações atualizadas.';
  }catch(e){this.error=this.msg(e)}
  finally{this.refreshing=false}
 }
 private dateWeekStart(date:string):string{
  const dt=new Date(date.slice(0,10)+'T12:00:00Z');
  dt.setUTCDate(dt.getUTCDate()-((dt.getUTCDay()+6)%7));
  return dt.toISOString().slice(0,10);
 }
 get pastoralWeeks():{date:string;count:number}[]{
  const dates=[...new Set(this.pastoralSlots.map(s=>this.dateWeekStart(s.appointment_date)))].sort();
  return dates.map(date=>({date,count:this.pastoralSlots.filter(s=>this.dateWeekStart(s.appointment_date)===date).length}));
 }
 get visiblePastoralSlots():PastoralSlot[]{
  return this.pastoralSlots.filter(s=>this.dateWeekStart(s.appointment_date)===this.pastoralWeekStart);
 }

 get filteredDeacons():Deacon[]{
  const q=this.normalizeSearch(this.search);
  const digits=q.replace(/\D/g,'');
  return this.deacons.filter(d=>
    (this.filter==='all'||(this.filter==='unassigned'?!d.group_id:d.cohort===this.filter))&&
    (!q||this.normalizeSearch(d.full_name).includes(q)||
     this.normalizeSearch(d.group_name||'').includes(q)||
     (digits.length>=3&&(d.phone||'').replace(/\D/g,'').includes(digits)))
  ).slice().sort((a,b)=>this.printCollator.compare(a.full_name,b.full_name));
 }

 get observationsWithNotes():number{
  return this.observations.filter(item=>!!item.restrictions_observations?.trim()).length;
 }
 get filteredObservations():ObservationEntry[]{
  const query=this.observationSearch.trim().toLocaleLowerCase('pt-BR');
  return this.observations.filter(item=>{
    const hasNote=!!item.restrictions_observations?.trim();
    if(this.observationFilter==='with'&&!hasNote)return false;
    if(this.observationFilter==='without'&&hasNote)return false;
    if(!query)return true;
    return [item.full_name,item.phone,item.restrictions_observations,item.spouse_name].some(value=>
      (value||'').toLocaleLowerCase('pt-BR').includes(query));
  });
 }

 get visibleWorkspaceItems():WorkspaceMember[]{
  if(!this.workspace)return [];
  return this.workspaceFilter==='due'?this.workspace.due:
   this.workspaceFilter==='without_contact'?this.workspace.without_contact:this.workspace.referrals;
 }
 get monthGroups():{name:string;leader_name:string|null;people:number;contacted:number}[]{
  return this.monthlyReport?.group_breakdown||[];
 }
 get monthCoverage():number{
  const t=this.monthlyReport?.totals;
  return t?.people?Math.round(t.contacted/t.people*100):0;
 }
  get unassigned():Deacon[]{return this.deacons.filter(d=>!d.group_id)}
 capacityPercent(g:Group):number{return g.target_size ? Math.min(100,Math.round(g.members/g.target_size*100)) : 0}
 get coverage():number{return this.dashboard.totals.deacons?Math.round(this.dashboard.totals.contacted_30_days/this.dashboard.totals.deacons*100):0}

 private restoreWorkspace():void{
  try{
   this.sidebarCollapsed=sessionStorage.getItem('jdg_compact_sidebar')==='yes';
   const page=sessionStorage.getItem('jdg_current_module') as Page|null;
   const allowed:Page[]=['dashboard','workspace','reports','deacons','observations','groups','leadership','intercession','pastoral','settings'];
   if(page&&allowed.includes(page)&&
      !(page==='observations'&&!this.admin)&&!(page==='settings'&&!this.admin)&&
      !((page==='pastoral'||page==='intercession')&&!this.canManage)){
     this.goto(page);
   }
  }catch{/* Preferências locais opcionais; nunca bloqueiam o login. */}
 }
 toggleSidebar():void{
  this.sidebarCollapsed=!this.sidebarCollapsed;
  try{sessionStorage.setItem('jdg_compact_sidebar',this.sidebarCollapsed?'yes':'no')}catch{}
 }
 async ngOnInit():Promise<void>{
  if(this.api.authorized){
   try{const u=await this.api.me();this.showChangePassword=!!u.must_change_password;
      if(!this.showChangePassword){await this.reload();this.restoreWorkspace()}}
   catch{this.api.clear()}
  }
  this.loading=false;
 }
 async login():Promise<void>{
  this.busy=true;this.error='';
  try{const u=await this.api.login(this.email,this.password);this.password='';
   this.showChangePassword=!!u.must_change_password;
   if(!this.showChangePassword){await this.reload();this.restoreWorkspace()}
  }catch(e){this.error=this.msg(e)}finally{this.busy=false}
 }
 async changePassword():Promise<void>{this.error='';if(this.changeNew.length<12){this.error='A senha precisa ter pelo menos 12 caracteres.';return}if(this.changeNew!==this.changeNewConfirm){this.error='A confirmação da senha não confere.';return}this.busy=true;try{await this.api.changePassword(this.changeOld,this.changeNew);if(this.api.user)this.api.user.must_change_password=false;this.changeOld='';this.changeNew='';this.changeNewConfirm='';this.showChangePassword=false;this.notice='Senha atualizada com sucesso.';await this.reload()}catch(e){this.error=this.msg(e)}finally{this.busy=false}}
 async logout():Promise<void>{
  await this.api.logout();
  try{sessionStorage.removeItem('jdg_current_module');sessionStorage.removeItem('jdg_compact_sidebar')}catch{}
  this.showChangePassword=false;this.closeQuickSearch();this.showHelp=false;this.page='dashboard';this.selected=null;
 }
 async reload():Promise<void>{this.error='';try{const [d,people,groups]=await Promise.all([this.api.dashboard(),this.api.deacons(),this.api.groups()]);this.dashboard=d;this.deacons=people;this.groups=groups;if(this.canManage)this.users=await this.api.users();else this.users=[]}catch(e){this.error=this.msg(e)}}
 goto(page:Page):void{
  if(page==='observations'&&!this.admin){this.error='Esta área é exclusiva do administrador.';return}
  if(page==='reports'&&!this.currentUser){this.error='É necessário entrar no sistema.';return}
  if((page==='pastoral'||page==='intercession')&&!this.canManage){this.error='Esta área é exclusiva da coordenação.';return}
  this.page=page;this.showMenu=false;this.closeQuickSearch();this.notice='';this.error='';
  if(page!=='followups')try{sessionStorage.setItem('jdg_current_module',page)}catch{}
  window.scrollTo(0,0);
  if(page!=='followups')this.selected=null;
  if(page==='observations'&&!this.observationsLoaded)void this.loadObservations();
  if(page==='pastoral'&&!this.pastoralLoaded)void this.loadPastoral();
  if(page==='intercession'&&!this.intercessionLoaded)void this.loadIntercession();
  if(page==='workspace'&&!this.workspaceLoaded)void this.loadWorkspace();
  if(page==='reports'&&!this.reportLoaded)void this.loadReports();

 }

 async loadWorkspace():Promise<void>{
  this.workspaceLoading=true;this.error='';
  try{
   this.workspace=await this.api.workspace();this.workspaceLoaded=true;
  }catch(e){this.error=this.msg(e)}
  finally{this.workspaceLoading=false}
 }
 async loadReports():Promise<void>{
  this.reportLoading=true;this.error='';
  try{
   this.monthlyReport=await this.api.monthlyReport(this.reportMonth);
   this.reportLoaded=true;
   if(this.admin){
    const [readiness,audit]=await Promise.all([
      this.api.readiness(),this.api.auditRecent()
    ]);
    this.readiness=readiness;this.recentAudit=audit;
   }else{this.readiness=null;this.recentAudit=[];}
  }catch(e){this.error=this.msg(e)}
  finally{this.reportLoading=false}
 }
 openWorkspaceMember(member:WorkspaceMember):void{
  const deacon=this.deacons.find(d=>d.id===member.id);
  if(deacon){this.select(deacon);window.scrollTo(0,0)}
  else this.error='A pessoa não está entre os seus cadastros autorizados. Atualize os dados.';
 }
 openWhatsapp(member:WorkspaceMember):void{
  const phone=(member.phone||'').replace(/\D/g,'');
  if(phone.length!==11&&phone.length!==10){
   this.error='Telefone inválido ou não cadastrado. Corrija antes de preparar a mensagem.';return;
  }
  const message='A paz do Senhor! Gostaríamos de saber como você está e combinar um momento de conversa, se desejar. Deus abençoe!';
  const url='https://wa.me/55'+phone+'?text='+encodeURIComponent(message);
  window.open(url,'_blank','noopener,noreferrer');
 }

 exportRosterCsv():void{
  const selected=this.printSelection==='all'?this.deacons:
    this.deacons.filter(d=>d.cohort===this.printSelection);
  if(!selected.length){this.error='Nenhum cadastro para exportação.';return}
  const people=selected.slice().sort((a,b)=>{
    const cohortSort=(a.cohort==='antigo'?0:1)-(b.cohort==='antigo'?0:1);
    return cohortSort||this.printCollator.compare(a.full_name,b.full_name);
  });
  const cols=['Nome completo','Turma','Situação',...(this.printWithPhone?['Telefone']:[])];
  const rows=[cols,...people.map(d=>[d.full_name,d.cohort,this.statusLabel(d.status),
    ...(this.printWithPhone?[d.phone||'']:[])])];
  const escape=(value:string):string=>{
    const escaped=/^[\s]*[=+@-]/.test(value)?"'"+value:value;
    return '"'+escaped.replace(/"/g,'""')+'"';
  };
  const csv='\uFEFF'+rows.map(row=>row.map(escape).join(';')).join('\r\n');
  const blob=new Blob([csv],{type:'text/csv;charset=utf-8'});
  const url=URL.createObjectURL(blob),link=document.createElement('a');
  link.href=url;link.download='diaconos_'+this.printSelection+'.csv';
  document.body.appendChild(link);link.click();link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),2000);
 }

  exportMonthlyReport():void{
  const report=this.monthlyReport;
  if(!report){this.error='Carregue o relatório antes de exportar.';return}
  const lines:string[][]=[
   ['Jornada Diaconal','Relatório mensal',report.month],
   ['Indicador','Quantidade'],
   ['Pessoas acompanhadas',String(report.totals.people)],
   ['Contatadas no período',String(report.totals.contacted)],
   ['Registros de contatos',String(report.totals.contact_records)],
   ['Sem grupo',String(report.totals.no_group)],
   ['Encaminhamentos pastorais sinalizados',String(report.totals.referred)],
   ['','',''],
   ['Grupo','Responsável','Pessoas','Contatadas'],
   ...report.group_breakdown.map(g=>[g.name,g.leader_name||'Não definido',String(g.people),String(g.contacted)])
  ];
  if(report.ministry)lines.push(['','',''],['Escalas publicadas',String(report.ministry.published_draws)],
   ['Atendimentos confirmados',String(report.ministry.confirmed_appointments)],
   ['Atendimentos realizados',String(report.ministry.completed_appointments)]);
  const csv='\uFEFF'+lines.map(row=>row.map(value=>'"'+String(value??'').replace(/"/g,'""')+'"').join(';')).join('\r\n');
  const file=new Blob([csv],{type:'text/csv;charset=utf-8'});
  const url=URL.createObjectURL(file);
  const link=document.createElement('a');link.href=url;link.download='jornada_relatorio_'+report.month+'.csv';
  document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);
 }

  async loadObservations():Promise<void>{
  if(!this.admin)return;
  this.observationsLoading=true;this.error='';
  try{
    this.observations=await this.api.observations();
    this.observationsLoaded=true;
  }catch(e){this.error=this.msg(e)}
  finally{this.observationsLoading=false}
 }
 viewObservation(item:ObservationEntry):void{
  const d=this.deacons.find(person=>person.id===item.id);
  if(!d){this.error='Cadastro não localizado. Atualize a tela e tente novamente.';return}
  this.select(d);
 }

 select(d:Deacon):void{
  this.showMenu=false;
  this.selected=d;
  this.selectedRegistry=null;
  this.page='followups';
  this.followups=[];
  this.fetchFollowups();
  if(this.admin)this.loadRegistry(d.id);
  void this.loadAvailability(d.id);
 }
 async loadRegistry(id:string):Promise<void>{
  this.registryLoading=true;
  try{const details=await this.api.registry(id);if(this.selected?.id===id)this.selectedRegistry=details}
  catch(e){this.error=this.msg(e)}
  finally{this.registryLoading=false}
 }

 async loadAvailability(id:string):Promise<void>{
  this.availabilityLoading=true;this.selectedAvailability=null;
  try{
   const item=await this.api.availability(id);
   if(this.selected?.id===id)this.selectedAvailability=item;
  }catch(e){if(this.selected?.id===id)this.error=this.msg(e)}
  finally{this.availabilityLoading=false}
 }
 async saveAvailability():Promise<void>{
  if(!this.selected||!this.selectedAvailability)return;
  const id=this.selected.id;
  const changes=this.selectedAvailability;
  await this.run(async()=>{
   await this.api.updateAvailability(id,{
    available_wed_15:changes.available_wed_15,
    available_wed_20:changes.available_wed_20,
    available_sun_10:changes.available_sun_10,
    available_sun_19:changes.available_sun_19,
    only_first_sunday:changes.only_first_sunday,
    mornings_only:changes.mornings_only
   });
   await this.loadAvailability(id);
   if(this.admin)await this.loadRegistry(id);
  },'Disponibilidade atualizada; será considerada nos próximos sorteios.');
 }
  async saveRegistry():Promise<void>{
  if(!this.admin||!this.selected||!this.selectedRegistry)return;
  const id=this.selected.id,details=this.selectedRegistry;
  await this.run(async()=>{
   await this.api.updateRegistry(id,{
    marital_status_original:details.marital_status_original,
    spouse_name:details.spouse_name,
    restrictions_observations:details.restrictions_observations,
    available_wed_15:details.available_wed_15,
    available_wed_20:details.available_wed_20,
    available_sun_10:details.available_sun_10,
    available_sun_19:details.available_sun_19,
    only_first_sunday:details.only_first_sunday,
    mornings_only:details.mornings_only
   });
   await this.loadRegistry(id);
   await this.reload();
  },'Cadastro original atualizado com sucesso.');
 }

 async fetchFollowups():Promise<void>{if(!this.selected)return;try{this.followups=await this.api.followups(this.selected.id)}catch(e){this.error=this.msg(e)}}
 async createDeacon():Promise<void>{
  const name=this.draftDeacon.full_name.trim();
  const phone=this.draftDeacon.phone.replace(/\D/g,'');
  if(name.length<3){this.error='Informe o nome completo, com pelo menos três caracteres.';return}
  if(phone && ![10,11].includes(phone.length)){this.error='Telefone deve conter DDD e 10 ou 11 dígitos.';return}
  const duplicate=this.deacons.some(person=>
   this.normalizeSearch(person.full_name)===this.normalizeSearch(name)&&
    (person.phone||'').replace(/\D/g,'')===phone);
  if(duplicate){this.error='Esse nome e telefone já constam no sistema. Abra o cadastro existente.';return}
  await this.run(async()=>{
   await this.api.createDeacon({...this.draftDeacon,full_name:name});
   this.showNewDeacon=false;
   this.draftDeacon={full_name:'',cohort:'antigo',status:'active',phone:'',email:'',availability:''};
   await this.reload();
  },'Diácono cadastrado. Confirme a disponibilidade no perfil antes de incluí-lo nas escalas.');
 }
 async createGroup():Promise<void>{await this.run(async()=>{await this.api.createGroup({...this.draftGroup,leader_id:this.draftGroup.leader_id||null});this.showNewGroup=false;this.draftGroup={name:'',target_size:10,leader_id:''};await this.reload()},'Grupo criado com sucesso.')}
 async createUser():Promise<void>{await this.run(async()=>{await this.api.createUser(this.draftUser);this.showNewUser=false;this.draftUser={name:'',email:'',password:'',role:'leader'};await this.reload()},'Responsável cadastrado.')}
 async changeLeader(groupId:string,leaderId:string):Promise<void>{await this.run(async()=>{await this.api.updateGroup(groupId,{leader_id:leaderId||null});await this.reload()},'Responsável atualizado.')}
 async assign(deaconId:string,groupId:string):Promise<void>{if(!groupId)return;await this.run(async()=>{await this.api.assign(groupId,deaconId);await this.reload()},'Grupo atualizado.')}
 async record():Promise<void>{if(!this.selected)return;await this.run(async()=>{await this.api.createFollowup({...this.draftFollowup,deacon_id:this.selected!.id,next_contact_on:this.draftFollowup.next_contact_on||null});this.showFollowup=false;this.draftFollowup={method:'mensagem',outcome:'contato_realizado',summary:'',next_contact_on:'',needs_pastoral_attention:false};await this.fetchFollowups();await this.reload()},'Acompanhamento registrado.')}
 async updateStatus(d:Deacon,status:string):Promise<void>{await this.run(async()=>{await this.api.updateDeacon(d.id,{status});await this.reload()},'Situação atualizada.')}
 private async run(action:()=>Promise<void>,success:string):Promise<void>{this.error='';this.notice='';this.busy=true;try{await action();this.notice=success}catch(e){this.error=this.msg(e)}finally{this.busy=false}}
 private msg(e:unknown):string{return e instanceof Error?e.message:'Não foi possível concluir a operação.'}


 readonly pastoralReasons:{value:PastoralCareReason;label:string}[]=[
   {value:'verify_status',label:'Conferir situação cadastral'},
   {value:'away_confirmed',label:'Afastamento confirmado pela liderança'},
   {value:'support_requested',label:'Acolhimento solicitado'},
   {value:'reconnection',label:'Retomar vínculo e contato'},
   {value:'new_integration',label:'Integração ao diaconato'},
   {value:'routine',label:'Acompanhamento regular'}
 ];
 readonly pastoralStages:{value:PastoralCareStage;label:string}[]=[
   {value:'to_contact',label:'A contatar'},
   {value:'contacted',label:'Contato realizado'},
   {value:'invited',label:'Convite enviado'},
   {value:'scheduled',label:'Agendado'},
   {value:'completed',label:'Atendido'},
   {value:'deferred',label:'Pausado'}
 ];
 get filteredPastoralQueue():PastoralQueueItem[]{
  const query=this.pastoralQueueSearch.trim().toLocaleLowerCase('pt-BR');
  return this.pastoralQueue.filter(item=>!query||
    (item.person?.full_name||'').toLocaleLowerCase('pt-BR').includes(query)||
    (item.person?.phone||'').includes(query));
 }
 pastoralReasonLabel(key:PastoralCareReason):string{
   return this.pastoralReasons.find(x=>x.value===key)?.label||key;
 }
 get pastoralBooked():number{return this.pastoralSlots.filter(slot=>slot.deacon_id!==null).length}
 get pastoralApproved():number{return this.pastoralSlots.filter(slot=>slot.approval_status==='approved').length}
 get intercessionConfigured():boolean{return this.intercessionTemplates.length>0&&this.intercessionTemplates.every(t=>t.people_per_service===4)}
 assignmentsForPost(draw:IntercessionDraw,post:'pastores'|'bateria'){
  return draw.assignments.filter(a=>a.service_post===post).sort((a,b)=>a.rotation_order-b.rotation_order);
 }
 showMinistryLeaders():void{this.goto('leadership')}
 openNewLeader():void{this.draftUser={name:'',email:'',password:'',role:'leader'};this.showNewUser=true}
 async loadPastoral():Promise<void>{
  if(!this.canManage)return;this.pastoralLoading=true;this.error='';
  try{
   const r=await this.api.pastoralSlots();
   this.pastoralSlots=r.items;
   this.pastoralDraft={};
   for(const slot of r.items){
    this.pastoralDraft[slot.id]={
      start_time:(slot.start_time||'').slice(0,5),
      deacon_id:slot.deacon_id||'',
      status:slot.status,
      approval_status:slot.approval_status
    };
   }
   this.pastoralLoaded=true;
   if(this.admin)await this.loadPastoralQueue();
  }catch(e){this.error=this.msg(e)}
  finally{this.pastoralLoading=false}
 }

 async loadPastoralQueue():Promise<void>{
  if(!this.admin)return;
  this.pastoralQueueLoading=true;
  try{
   const result=await this.api.pastoralQueue();
   this.pastoralQueue=result.items;
   this.pastoralVerifyCandidates=result.needs_verification;
   this.pastoralQueueDraft={};
   for(const person of result.items){
    this.pastoralQueueDraft[person.id]={
     priority:person.priority,reason:person.reason,stage:person.stage
    };
   }
   this.pastoralQueueLoaded=true;
  }catch(e){this.error=this.msg(e)}
  finally{this.pastoralQueueLoading=false}
 }
 async addPastoralCandidate():Promise<void>{
  if(!this.pastoralNew.deacon_id){this.error='Escolha um diácono para incluir na fila.';return;}
  await this.run(async()=>{
   await this.api.addPastoralQueue({...this.pastoralNew});
   this.pastoralNew={deacon_id:'',priority:2,reason:'verify_status'};
   await this.loadPastoralQueue();
  },'Pessoa incluída na fila pastoral. Nenhum convite foi enviado.');
 }
 async addPastoralVerification(person:PastoralCarePerson):Promise<void>{
  await this.run(async()=>{
   await this.api.addPastoralQueue({
    deacon_id:person.id,priority:2,reason:'verify_status'
   });
   await this.loadPastoralQueue();
  },'Situação adicionada para conferência da liderança, sem presumir afastamento.');
 }
 async updatePastoralCandidate(item:PastoralQueueItem):Promise<void>{
  const fields=this.pastoralQueueDraft[item.id];if(!fields)return;
  await this.run(async()=>{
   await this.api.updatePastoralQueue(item.id,{...fields});
   await this.loadPastoralQueue();
  },'Prioridade e etapa de acompanhamento atualizadas.');
 }
 preparePastoralSlot(item:PastoralQueueItem):void{
  if(!item.person){this.error='Cadastro não encontrado.';return}
  const slot=this.pastoralSlots.find(v=>!v.deacon_id&&v.status==='proposed');
  if(!slot||!this.pastoralDraft[slot.id]){
    this.error='Não há vaga livre na agenda proposta. Revise a agenda do pastor.';return;
  }
  this.pastoralWeekStart=this.dateWeekStart(slot.appointment_date);
  this.pastoralDraft[slot.id].deacon_id=item.deacon_id;
  setTimeout(()=>document.getElementById('pastoral-appointment-list')?.scrollIntoView({behavior:'smooth',block:'start'}),0);
  this.notice='Nome reservado apenas no formulário do atendimento '+slot.appointment_date+
     '. Confira o horário, obtenha aprovação do Pr. Sato e clique em Salvar na agenda abaixo.';
 }
  async savePastoral(slot:PastoralSlot):Promise<void>{
  const draft=this.pastoralDraft[slot.id];if(!draft)return;
  await this.run(async()=>{
   await this.api.updatePastoralSlot(slot.id,{
    start_time:draft.start_time||null,
    deacon_id:draft.deacon_id||null,
    status:draft.status,
    approval_status:draft.approval_status
   });
   await this.loadPastoral();
  },'Atendimento salvo. Nenhuma convocação foi enviada.');
 }
 async loadIntercession():Promise<void>{
  if(!this.canManage)return;this.intercessionLoading=true;this.error='';
  try{
   const [ts,week]=await Promise.all([
    this.api.intercessionTemplates(),this.api.intercessionWeek(this.intercessionWeekStart)
   ]);
   this.intercessionTemplates=ts;
   this.intercessionDraws=week.items;
   this.intercessionCandidates={};
   this.intercessionPostEditor={};
   this.intercessionCapacity={};
   for(const t of ts)this.intercessionCapacity[t.id]=t.people_per_service||0;
   this.intercessionLoaded=true;
  }catch(e){this.error=this.msg(e)}
  finally{this.intercessionLoading=false}
 }
 async saveIntercessionCapacity(t:IntercessionTemplate):Promise<void>{
  const value=Number(this.intercessionCapacity[t.id]);
  await this.run(async()=>{
   await this.api.updateIntercessionTemplate(t.id,value);
   await this.loadIntercession();
  },'Quantidade de intercessores atualizada.');
 }
 async drawIntercession():Promise<void>{
  if(!this.intercessionConfigured){this.error='A configuração deve reservar quatro intercessores por culto.';return}
  await this.run(async()=>{
   const result=await this.api.raffleIntercession(this.intercessionWeekStart);
   await this.loadIntercession();
   if(!result.complete)this.notice='Rascunho criado, mas alguns cultos ficaram com vagas em aberto. Não publique sem completar as vagas.';
  },'Sorteio realizado como rascunho. Revise antes de publicar.');
 }

 async confirmIntercession(aId:string,status:'proposed'|'confirmed'|'declined'):Promise<void>{
  await this.run(async()=>{
   await this.api.confirmIntercessor(aId,status);
   await this.loadIntercession();
  },'Confirmação da escala atualizada.');
 }
 async toggleIntercessionEditor(drawId:string,post:'pastores'|'bateria'):Promise<void>{
  const key=drawId+'|'+post;
  if(this.intercessionPostEditor[key]){this.intercessionPostEditor[key]=false;return}
  this.error='';
  try{
   const candidates=await this.api.intercessionCandidates(drawId,post);
   this.intercessionCandidates[key]=candidates;
   this.intercessionPostEditor[key]=true;
  }catch(e){this.error=this.msg(e)}
 }
  async replaceIntercessionPost(drawId:string,post:'pastores'|'bateria'):Promise<void>{
  const prefix=drawId+'|'+post;
  const first=this.intercessionReplacements[prefix+'|1'];
  const second=this.intercessionReplacements[prefix+'|2'];
  if(!first||!second||first===second){this.error='Escolha duas pessoas diferentes para a mesma porta.';return}
  const pool=this.intercessionCandidates[prefix]||[];
  const p1=pool.find(x=>x.id===first),p2=pool.find(x=>x.id===second);
  if(!p1||!p2){this.error='Atualize os candidatos disponíveis antes de substituir a dupla.';return}
  if((p1.spouse_id&&p1.spouse_id!==second)||(p2.spouse_id&&p2.spouse_id!==first)){
   this.error='Os casais cadastrados devem ser escalados juntos na mesma porta.';return;
  }
  await this.run(async()=>{
   await this.api.replaceIntercessionPost(drawId,post,[first,second]);
   await this.loadIntercession();
  },'Dupla salva na mesma porta, para revezamento. Confirme ambas antes de publicar.');
 }
  canPublish(draw:IntercessionDraw):boolean{
  return draw.status==='draft'&&draw.service?.people_per_service===4&&
    draw.assignments.length===4&&draw.assignments.every(a=>a.status==='confirmed')&&
    this.intercessionPosts.every(post=>{
      const group=this.assignmentsForPost(draw,post.id);
      return group.length===2&&group[0].rotation_order===1&&group[1].rotation_order===2;
    });
 }
  async publishIntercession(d:IntercessionDraw):Promise<void>{
  await this.run(async()=>{
   await this.api.publishIntercession(d.id);
   await this.loadIntercession();
  },'Escala aprovada e publicada no sistema. Nenhuma mensagem foi enviada.');
 }
 changeIntercessionWeek(weeks:number):void{
  const dt=new Date(this.intercessionWeekStart+'T12:00:00Z');
  dt.setUTCDate(dt.getUTCDate()+weeks*7);
  this.intercessionWeekStart=dt.toISOString().slice(0,10);
  void this.loadIntercession();
 }
  cohortLabel(c:string):string{return c==='novo'?'Novo':'Antigo'}
 statusLabel(s:string):string{return s==='active'?'Ativo':s==='away'?'Afastamento temporário':'Inativo'}
 outcomeLabel(s:string):string{return ({contato_realizado:'Contato realizado',retornar:'Retornar contato',sem_resposta:'Não respondeu',encaminhar:'Encaminhar à liderança'} as Record<string,string>)[s]||s}
}