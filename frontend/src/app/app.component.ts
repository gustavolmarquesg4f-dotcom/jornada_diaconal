import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, User, Deacon, RegistryDetails, ObservationEntry, Group, Followup, Dashboard } from './api.service';

type Page = 'dashboard'|'deacons'|'observations'|'groups'|'followups'|'settings';
@Component({selector:'app-root',standalone:true,imports:[CommonModule,FormsModule],templateUrl:'./app.component.html'})
export class AppComponent implements OnInit {
 api=inject(ApiService);
 loading=true;busy=false;error='';notice='';page:Page='dashboard';
 email='';password='';changeOld='';changeNew='';changeNewConfirm='';showChangePassword=false;showMenu=false;showNewDeacon=false;showNewGroup=false;showNewUser=false;showFollowup=false;
 dashboard:Dashboard={totals:{deacons:0,without_group:0,contacted_30_days:0,without_recent_contact:0},groups:[]};
 deacons:Deacon[]=[];groups:Group[]=[];users:User[]=[];followups:Followup[]=[];
 observations:ObservationEntry[]=[];observationsLoading=false;observationsLoaded=false;observationSearch='';observationFilter:'all'|'with'|'without'='all';
 selected:Deacon|null=null;selectedRegistry:RegistryDetails|null=null;registryLoading=false;search='';filter:'all'|'antigo'|'novo'|'unassigned'='all';
 draftDeacon={full_name:'',cohort:'antigo',status:'active',phone:'',email:'',availability:''};
 draftGroup={name:'',target_size:10,leader_id:''};
 draftUser={name:'',email:'',password:'',role:'leader'};
 draftFollowup={method:'mensagem',outcome:'contato_realizado',summary:'',next_contact_on:'',needs_pastoral_attention:false};
 get currentUser():User|null{return this.api.user}
 get canManage():boolean{return this.currentUser?.role==='admin'||this.currentUser?.role==='coordinator'}
 get admin():boolean{return this.currentUser?.role==='admin'}
 get filteredDeacons():Deacon[]{const q=this.search.trim().toLocaleLowerCase('pt-BR');return this.deacons.filter(d=>(this.filter==='all'||(this.filter==='unassigned'?!d.group_id:d.cohort===this.filter))&&(!q||d.full_name.toLocaleLowerCase('pt-BR').includes(q)||(d.group_name||'').toLocaleLowerCase('pt-BR').includes(q)))}

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
 get unassigned():Deacon[]{return this.deacons.filter(d=>!d.group_id)}
 capacityPercent(g:Group):number{return g.target_size ? Math.min(100,Math.round(g.members/g.target_size*100)) : 0}
 get coverage():number{return this.dashboard.totals.deacons?Math.round(this.dashboard.totals.contacted_30_days/this.dashboard.totals.deacons*100):0}
 async ngOnInit():Promise<void>{if(this.api.authorized){try{const u=await this.api.me();this.showChangePassword=!!u.must_change_password;if(!this.showChangePassword)await this.reload()}catch{this.api.clear()}}this.loading=false}
 async login():Promise<void>{this.busy=true;this.error='';try{const u=await this.api.login(this.email,this.password);this.password='';this.showChangePassword=!!u.must_change_password;if(!this.showChangePassword)await this.reload()}catch(e){this.error=this.msg(e)}finally{this.busy=false}}
 async changePassword():Promise<void>{this.error='';if(this.changeNew.length<12){this.error='A senha precisa ter pelo menos 12 caracteres.';return}if(this.changeNew!==this.changeNewConfirm){this.error='A confirmação da senha não confere.';return}this.busy=true;try{await this.api.changePassword(this.changeOld,this.changeNew);if(this.api.user)this.api.user.must_change_password=false;this.changeOld='';this.changeNew='';this.changeNewConfirm='';this.showChangePassword=false;this.notice='Senha atualizada com sucesso.';await this.reload()}catch(e){this.error=this.msg(e)}finally{this.busy=false}}
 async logout():Promise<void>{await this.api.logout();this.showChangePassword=false;this.page='dashboard';this.selected=null}
 async reload():Promise<void>{this.error='';try{const [d,people,groups]=await Promise.all([this.api.dashboard(),this.api.deacons(),this.api.groups()]);this.dashboard=d;this.deacons=people;this.groups=groups;if(this.canManage)this.users=await this.api.users();else this.users=[]}catch(e){this.error=this.msg(e)}}
 goto(page:Page):void{
  if(page==='observations'&&!this.admin){this.error='Esta área é exclusiva do administrador.';return}
  this.page=page;this.showMenu=false;this.notice='';this.error='';
  if(page!=='followups')this.selected=null;
  if(page==='observations'&&!this.observationsLoaded)void this.loadObservations();
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
  this.selected=d;
  this.selectedRegistry=null;
  this.page='followups';
  this.followups=[];
  this.fetchFollowups();
  if(this.admin)this.loadRegistry(d.id);
 }
 async loadRegistry(id:string):Promise<void>{
  this.registryLoading=true;
  try{const details=await this.api.registry(id);if(this.selected?.id===id)this.selectedRegistry=details}
  catch(e){this.error=this.msg(e)}
  finally{this.registryLoading=false}
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
 async createDeacon():Promise<void>{await this.run(async()=>{await this.api.createDeacon(this.draftDeacon);this.showNewDeacon=false;this.draftDeacon={full_name:'',cohort:'antigo',status:'active',phone:'',email:'',availability:''};await this.reload()},'Diácono cadastrado com sucesso.')}
 async createGroup():Promise<void>{await this.run(async()=>{await this.api.createGroup({...this.draftGroup,leader_id:this.draftGroup.leader_id||null});this.showNewGroup=false;this.draftGroup={name:'',target_size:10,leader_id:''};await this.reload()},'Grupo criado com sucesso.')}
 async createUser():Promise<void>{await this.run(async()=>{await this.api.createUser(this.draftUser);this.showNewUser=false;this.draftUser={name:'',email:'',password:'',role:'leader'};await this.reload()},'Responsável cadastrado.')}
 async changeLeader(groupId:string,leaderId:string):Promise<void>{await this.run(async()=>{await this.api.updateGroup(groupId,{leader_id:leaderId||null});await this.reload()},'Responsável atualizado.')}
 async assign(deaconId:string,groupId:string):Promise<void>{if(!groupId)return;await this.run(async()=>{await this.api.assign(groupId,deaconId);await this.reload()},'Grupo atualizado.')}
 async record():Promise<void>{if(!this.selected)return;await this.run(async()=>{await this.api.createFollowup({...this.draftFollowup,deacon_id:this.selected!.id,next_contact_on:this.draftFollowup.next_contact_on||null});this.showFollowup=false;this.draftFollowup={method:'mensagem',outcome:'contato_realizado',summary:'',next_contact_on:'',needs_pastoral_attention:false};await this.fetchFollowups();await this.reload()},'Acompanhamento registrado.')}
 async updateStatus(d:Deacon,status:string):Promise<void>{await this.run(async()=>{await this.api.updateDeacon(d.id,{status});await this.reload()},'Situação atualizada.')}
 private async run(action:()=>Promise<void>,success:string):Promise<void>{this.error='';this.notice='';this.busy=true;try{await action();this.notice=success}catch(e){this.error=this.msg(e)}finally{this.busy=false}}
 private msg(e:unknown):string{return e instanceof Error?e.message:'Não foi possível concluir a operação.'}
 cohortLabel(c:string):string{return c==='novo'?'Novo':'Antigo'}
 statusLabel(s:string):string{return s==='active'?'Ativo':s==='away'?'Afastamento temporário':'Inativo'}
 outcomeLabel(s:string):string{return ({contato_realizado:'Contato realizado',retornar:'Retornar contato',sem_resposta:'Não respondeu',encaminhar:'Encaminhar à liderança'} as Record<string,string>)[s]||s}
}