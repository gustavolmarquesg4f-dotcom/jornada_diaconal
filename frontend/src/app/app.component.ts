import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, User, Deacon, Group, Followup, Dashboard, DiscipleshipMeeting, DiscipleshipAttendance, AttendanceStatus } from './api.service';

type Page = 'dashboard'|'deacons'|'groups'|'followups'|'discipleships'|'settings';
@Component({selector:'app-root',standalone:true,imports:[CommonModule,FormsModule],templateUrl:'./app.component.html'})
export class AppComponent implements OnInit {
 api=inject(ApiService);
 loading=true;busy=false;error='';notice='';page:Page='dashboard';
 email='';password='';showMenu=false;showNewDeacon=false;showNewGroup=false;showNewUser=false;showFollowup=false;showNewMeeting=false;
 dashboard:Dashboard={totals:{deacons:0,without_group:0,contacted_30_days:0,without_recent_contact:0},groups:[]};
 deacons:Deacon[]=[];groups:Group[]=[];users:User[]=[];followups:Followup[]=[];
 meetings:DiscipleshipMeeting[]=[];meetingAttendance:DiscipleshipAttendance[]=[];selectedMeeting:DiscipleshipMeeting|null=null;
 draftMeeting={title:'',scheduled_at:'',location:''};
 selected:Deacon|null=null;search='';filter:'all'|'antigo'|'novo'|'unassigned'='all';
 draftDeacon={full_name:'',cohort:'antigo',status:'active',phone:'',email:'',availability:''};
 draftGroup={name:'',target_size:10,leader_id:''};
 draftUser={name:'',email:'',password:'',role:'leader'};
 draftFollowup={method:'mensagem',outcome:'contato_realizado',summary:'',next_contact_on:'',needs_pastoral_attention:false};
 get currentUser():User|null{return this.api.user}
 get canManage():boolean{return this.currentUser?.role==='admin'||this.currentUser?.role==='coordinator'}
 get admin():boolean{return this.currentUser?.role==='admin'}
 get filteredDeacons():Deacon[]{const q=this.search.trim().toLocaleLowerCase('pt-BR');return this.deacons.filter(d=>(this.filter==='all'||(this.filter==='unassigned'?!d.group_id:d.cohort===this.filter))&&(!q||d.full_name.toLocaleLowerCase('pt-BR').includes(q)||(d.group_name||'').toLocaleLowerCase('pt-BR').includes(q)))}
 get unassigned():Deacon[]{return this.deacons.filter(d=>!d.group_id)}
 capacityPercent(g:Group):number{return g.target_size ? Math.min(100,Math.round(g.members/g.target_size*100)) : 0}
 get coverage():number{return this.dashboard.totals.deacons?Math.round(this.dashboard.totals.contacted_30_days/this.dashboard.totals.deacons*100):0}
 get meetingPresent():number{return this.meetingAttendance.filter(p=>p.attendance==='present').length}
 get meetingUnable():number{return this.meetingAttendance.filter(p=>p.attendance==='unable').length}
 get meetingUnreported():number{return this.meetingAttendance.filter(p=>p.attendance==='unreported').length}
 async ngOnInit():Promise<void>{if(this.api.authorized){try{await this.api.me();await this.reload()}catch{this.api.clear()}}this.loading=false}
 async login():Promise<void>{this.busy=true;this.error='';try{await this.api.login(this.email,this.password);this.password='';await this.reload()}catch(e){this.error=this.msg(e)}finally{this.busy=false}}
 async logout():Promise<void>{await this.api.logout();this.page='dashboard';this.selected=null}
 async reload():Promise<void>{this.error='';try{const [d,people,groups]=await Promise.all([this.api.dashboard(),this.api.deacons(),this.api.groups()]);this.dashboard=d;this.deacons=people;this.groups=groups;if(this.canManage)this.users=await this.api.users();else this.users=[]}catch(e){this.error=this.msg(e)}}
 goto(page:Page):void{this.page=page;this.showMenu=false;this.notice='';this.error='';if(page!=='followups')this.selected=null;if(page==='discipleships')void this.loadMeetings()}
 select(d:Deacon):void{this.selected=d;this.page='followups';this.followups=[];this.fetchFollowups()}
 async fetchFollowups():Promise<void>{if(!this.selected)return;try{this.followups=await this.api.followups(this.selected.id)}catch(e){this.error=this.msg(e)}}
 async createDeacon():Promise<void>{await this.run(async()=>{await this.api.createDeacon(this.draftDeacon);this.showNewDeacon=false;this.draftDeacon={full_name:'',cohort:'antigo',status:'active',phone:'',email:'',availability:''};await this.reload()},'Diácono cadastrado com sucesso.')}
 async createGroup():Promise<void>{await this.run(async()=>{await this.api.createGroup({...this.draftGroup,leader_id:this.draftGroup.leader_id||null});this.showNewGroup=false;this.draftGroup={name:'',target_size:10,leader_id:''};await this.reload()},'Grupo criado com sucesso.')}
 async createUser():Promise<void>{await this.run(async()=>{await this.api.createUser(this.draftUser);this.showNewUser=false;this.draftUser={name:'',email:'',password:'',role:'leader'};await this.reload()},'Responsável cadastrado.')}
 async changeLeader(groupId:string,leaderId:string):Promise<void>{await this.run(async()=>{await this.api.updateGroup(groupId,{leader_id:leaderId||null});await this.reload()},'Responsável atualizado.')}
 async assign(deaconId:string,groupId:string):Promise<void>{if(!groupId)return;await this.run(async()=>{await this.api.assign(groupId,deaconId);await this.reload()},'Grupo atualizado.')}
 async record():Promise<void>{if(!this.selected)return;await this.run(async()=>{await this.api.createFollowup({...this.draftFollowup,deacon_id:this.selected!.id,next_contact_on:this.draftFollowup.next_contact_on||null});this.showFollowup=false;this.draftFollowup={method:'mensagem',outcome:'contato_realizado',summary:'',next_contact_on:'',needs_pastoral_attention:false};await this.fetchFollowups();await this.reload()},'Acompanhamento registrado.')}
 async updateStatus(d:Deacon,status:string):Promise<void>{await this.run(async()=>{await this.api.updateDeacon(d.id,{status});await this.reload()},'Situação atualizada.')}
 async loadMeetings():Promise<void>{this.error='';try{this.meetings=await this.api.discipleships()}catch(e){this.error=this.msg(e)}}
 async openMeeting(m:DiscipleshipMeeting):Promise<void>{this.selectedMeeting=m;this.error='';try{this.meetingAttendance=await this.api.discipleshipAttendance(m.id)}catch(e){this.meetingAttendance=[];this.error=this.msg(e)}}
 async createMeeting():Promise<void>{await this.run(async()=>{await this.api.createDiscipleship(this.draftMeeting);this.showNewMeeting=false;this.draftMeeting={title:'',scheduled_at:'',location:''};await this.loadMeetings()},'Encontro agendado.')}
 async setAttendance(personId:string,status:string):Promise<void>{if(!this.selectedMeeting||!['present','unable','unreported'].includes(status))return;const meetingId=this.selectedMeeting.id;await this.run(async()=>{await this.api.setDiscipleshipAttendance(meetingId,personId,status as AttendanceStatus);this.meetingAttendance=await this.api.discipleshipAttendance(meetingId);await this.loadMeetings()},'Participação atualizada.')}
 attendanceLabel(s:AttendanceStatus):string{return ({present:'Presente',unable:'Impedimento informado',unreported:'Não informado'} as const)[s]}
 private async run(action:()=>Promise<void>,success:string):Promise<void>{this.error='';this.notice='';this.busy=true;try{await action();this.notice=success}catch(e){this.error=this.msg(e)}finally{this.busy=false}}
 private msg(e:unknown):string{return e instanceof Error?e.message:'Não foi possível concluir a operação.'}
 cohortLabel(c:string):string{return c==='novo'?'Novo':'Antigo'}
 statusLabel(s:string):string{return s==='active'?'Ativo':s==='away'?'Afastamento temporário':'Inativo'}
 outcomeLabel(s:string):string{return ({contato_realizado:'Contato realizado',retornar:'Retornar contato',sem_resposta:'Não respondeu',encaminhar:'Encaminhar à liderança'} as Record<string,string>)[s]||s}
}