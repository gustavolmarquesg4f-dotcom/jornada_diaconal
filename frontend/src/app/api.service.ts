import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { firstValueFrom, timeout, TimeoutError } from 'rxjs';

declare global { interface Window { __DIACONATO_CONFIG__?: { apiUrl: string } } }
export type Role = 'admin'|'coordinator'|'leader';
export type Cohort = 'antigo'|'novo';
export type DeaconStatus = 'active'|'away'|'inactive';
export interface User { id: string; name: string; email: string; role: Role; active?: boolean; must_change_password?: boolean }
export interface Deacon { id: string; full_name: string; cohort: Cohort; status: DeaconStatus; phone?: string; email?: string; availability?: string; group_id?: string; group_name?: string; last_contact?: string }
export interface AvailabilityProfile {
 deacon_id:string;available_wed_15:boolean;available_wed_20:boolean;
 available_sun_10:boolean;available_sun_19:boolean;only_first_sunday:boolean;
 mornings_only:boolean;updated_at:string|null;
}
export interface RegistryDetails {
 deacon_id:string;
 available_wed_15:boolean; available_wed_20:boolean;
 available_sun_10:boolean; available_sun_19:boolean;
 only_first_sunday:boolean; mornings_only:boolean;
 marital_status_original:string|null;
 spouse_name:string|null;
 restrictions_observations:string|null;
 source_row_number?:number;
}
export interface ObservationEntry {
 id:string; full_name:string; phone:string|null; cohort:Cohort; status:DeaconStatus;
 marital_status_original:string|null; spouse_name:string|null;
 restrictions_observations:string|null; source_row_number:number|null;
 available_wed_15:boolean; available_wed_20:boolean;
 available_sun_10:boolean; available_sun_19:boolean;
 only_first_sunday:boolean; mornings_only:boolean;
}
export interface Group { id: string; name: string; leader_id: string|null; leader_deacon_id: string|null; leader_access_enabled:boolean; leader_name: string|null; members: number; target_size: number }
export interface Followup { id: string; contacted_at: string; author: string; method: string; outcome: string; summary: string; next_contact_on?: string; needs_pastoral_attention: boolean }
export interface IntercessionTemplate {
 id:string;label:string;weekday:number;start_time:string;people_per_service:number|null;active:boolean;
}
export interface IntercessionCandidate {id:string;full_name:string;phone:string|null;spouse_id:string|null}
export interface IntercessionAssignment {
 id:string;draw_id:string;deacon_id:string;status:'proposed'|'confirmed'|'declined';
 service_post:'pastores'|'bateria';rotation_order:1|2;
 deacon:{id:string;full_name:string;phone:string|null}|null;
}
export interface IntercessionDraw {
 id:string; template_id:string;service_date:string;status:'draft'|'published';
 service:IntercessionTemplate|null;assignments:IntercessionAssignment[];
}
export type PastoralCareReason='verify_status'|'away_confirmed'|'support_requested'|'reconnection'|'new_integration'|'routine';
export type PastoralCareStage='to_contact'|'contacted'|'invited'|'scheduled'|'completed'|'deferred';
export interface PastoralCarePerson {
 id:string;full_name:string;phone:string|null;status:DeaconStatus;cohort:Cohort;last_contact:string|null;
}
export interface PastoralQueueItem {
 id:string;deacon_id:string;priority:number;reason:PastoralCareReason;stage:PastoralCareStage;
 created_at:string;updated_at:string;person:PastoralCarePerson|null;
}
export interface PastoralSlot {
 id:string;appointment_date:string;slot_order:number;start_time:string|null;
 duration_minutes:number;deacon_id:string|null;
 status:'proposed'|'invited'|'confirmed'|'completed'|'cancelled';
 approval_status:'awaiting_pastor'|'approved';
 deacon:{id:string;full_name:string;phone:string|null;status:string;cohort:string}|null;
}
export interface WorkspaceMember {
 id:string;full_name:string;phone:string|null;group_id:string|null;group_name:string|null;
 cohort:Cohort;status:DeaconStatus;last_contact:string|null;next_contact_on:string|null;
 due:boolean;no_recent_contact:boolean;needs_pastoral_attention:boolean;
}
export interface LeaderWorkspace {
 role:Role;groups:Group[];
 totals:{people:number;groups:number;due:number;without_contact:number;without_group:number;pastoral_referrals:number};
 due:WorkspaceMember[];without_contact:WorkspaceMember[];referrals:WorkspaceMember[];
}
export interface MonthlyReport {
 month:string;scope:Role;period:{start:string;end_exclusive:string};
 totals:{people:number;active:number;inactive:number;away:number;contacted:number;contact_records:number;no_group:number;groups:number;referred:number};
 cohorts:{antigo:number;novo:number};by_method:Record<string,number>;by_outcome:Record<string,number>;
 group_breakdown:{id:string;name:string;leader_name:string|null;people:number;contacted:number}[];
 ministry?:{draws:number;published_draws:number;pastoral_slots:number;confirmed_appointments:number;completed_appointments:number};
}
export interface ReadinessSummary {
 totals:{people:number;old:number;new:number;without_availability:number;groups:number;without_group:number;leaders:number;coordinators:number;pending_pastoral:number;pastoral_approved:number;draws:number;published_draws:number};
}
export interface AuditEvent {
 id:number;event:string;target_id:string|null;created_at:string;actor:string;
}
export interface Dashboard { totals: {deacons:number;without_group:number;contacted_30_days:number;without_recent_contact:number};groups:Group[] }
@Injectable({providedIn:'root'})
export class ApiService {
 private http=inject(HttpClient);
 readonly apiUrl=(window.__DIACONATO_CONFIG__?.apiUrl ?? (location.hostname === 'localhost' ? 'http://localhost:8080' : '')).replace(/\/$/,'');
 user:User|null=null;
 get token():string|null{return sessionStorage.getItem('diaconato_access_token')}
 get authorized():boolean{return !!this.token}
 private headers():HttpHeaders{return new HttpHeaders(this.token?{'Authorization':`Bearer ${this.token}`}:{})}
 private async send<T>(method:'GET'|'POST'|'PATCH'|'DELETE',path:string,body?:unknown):Promise<T>{
   if (!this.apiUrl) throw new Error('A API ainda não foi configurada. Confira a configuração do serviço Supabase da Jornada Diaconal.');
   try {return await firstValueFrom(this.http.request<T>(method,this.apiUrl+path,{headers:this.headers(),body}).pipe(timeout({first:30000}))) as T}
   catch(e){if(e instanceof TimeoutError)throw Error('O servidor demorou para responder. Confira sua conexão e tente atualizar os dados.');if(e instanceof HttpErrorResponse){if(e.status===401){this.clear()}throw Error(e.error?.error||`Falha de comunicação (${e.status||'rede'}).`)}throw e}
 }
 clear():void{sessionStorage.removeItem('diaconato_access_token');this.user=null}
 async login(email:string,password:string):Promise<User>{const result=await this.send<{user:User;token:string}>('POST','/auth/login',{email,password});sessionStorage.setItem('diaconato_access_token',result.token);this.user=result.user;return result.user}
 async me():Promise<User>{const x=await this.send<{user:User}>('GET','/auth/me');this.user=x.user;return x.user}
 changePassword(old_password:string,new_password:string):Promise<{ok:boolean}>{return this.send('POST','/auth/change-password',{old_password,new_password})}
 async logout():Promise<void>{try{await this.send('POST','/auth/logout',{})}finally{this.clear()}}
 dashboard():Promise<Dashboard>{return this.send('GET','/dashboard')}
 async deacons():Promise<Deacon[]>{return (await this.send<{items:Deacon[]}>('GET','/deacons')).items}
 async observations():Promise<ObservationEntry[]>{
   return (await this.send<{items:ObservationEntry[]}>('GET','/registry-observations')).items;
 }
 async registry(id:string):Promise<RegistryDetails|null>{
  const result=await this.send<{item:RegistryDetails|null}>('GET',`/deacons/${encodeURIComponent(id)}/registry`);
  return result.item;
 }
 async updateRegistry(id:string,fields:Partial<RegistryDetails>):Promise<{item:RegistryDetails}>{
  return this.send('PATCH',`/deacons/${encodeURIComponent(id)}/registry`,fields);
 }
  createDeacon(d:unknown):Promise<{id:string}>{return this.send('POST','/deacons',d)}
 updateDeacon(id:string,d:unknown):Promise<{ok:boolean}>{return this.send('PATCH',`/deacons/${encodeURIComponent(id)}`,d)}
 async groups():Promise<Group[]>{return (await this.send<{items:Group[]}>('GET','/groups')).items}
 createGroup(g:unknown):Promise<{id:string}>{return this.send('POST','/groups',g)}
 updateGroup(id:string,g:unknown):Promise<{ok:boolean}>{return this.send('PATCH',`/groups/${encodeURIComponent(id)}`,g)}
 archiveGroup(id:string):Promise<{ok:boolean;archived:boolean}>{
  return this.send('DELETE',`/groups/${encodeURIComponent(id)}`);
 }
 assign(group:string,deacon:string):Promise<{ok:boolean}>{return this.send('POST',`/groups/${encodeURIComponent(group)}/members`,{deacon_id:deacon})}
 assignBatch(group:string,deacons:string[]):Promise<{ok:boolean;assigned:number}>{
  return this.send('POST',`/groups/${encodeURIComponent(group)}/members/batch`,{deacon_ids:deacons});
 }
 unassign(group:string,deacon:string):Promise<{ok:boolean}>{return this.send('DELETE',`/groups/${encodeURIComponent(group)}/members/${encodeURIComponent(deacon)}`)}

 async users():Promise<User[]>{return (await this.send<{items:User[]}>('GET','/users')).items}
 createUser(u:unknown):Promise<{item:User}>{return this.send('POST','/users',u)}
 async followups(deaconId:string):Promise<Followup[]>{return (await this.send<{items:Followup[]}>('GET',`/followups?deacon_id=${encodeURIComponent(deaconId)}`)).items}
 createFollowup(f:unknown):Promise<{id:string}>{return this.send('POST','/followups',f)}
 async availability(id:string):Promise<AvailabilityProfile>{
  return (await this.send<{item:AvailabilityProfile}>('GET',`/deacons/${encodeURIComponent(id)}/availability`)).item;
 }
 async updateAvailability(id:string,flags:Partial<AvailabilityProfile>):Promise<AvailabilityProfile>{
  return (await this.send<{item:AvailabilityProfile}>('PATCH',`/deacons/${encodeURIComponent(id)}/availability`,flags)).item;
 }
  workspace():Promise<LeaderWorkspace>{
   return this.send('GET','/workspace');
 }
 monthlyReport(month:string):Promise<MonthlyReport>{
   return this.send('GET',`/reports/monthly?month=${encodeURIComponent(month)}`);
 }
 readiness():Promise<ReadinessSummary>{
   return this.send('GET','/readiness');
 }
 async auditRecent():Promise<AuditEvent[]>{
   return (await this.send<{items:AuditEvent[]}>('GET','/audit/recent')).items;
 }
 pastoralQueue():Promise<{items:PastoralQueueItem[];needs_verification:PastoralCarePerson[]}>{
   return this.send('GET','/pastoral/queue');
 }
 addPastoralQueue(item:{deacon_id:string;priority:number;reason:PastoralCareReason}):Promise<{item:PastoralQueueItem}>{
   return this.send('POST','/pastoral/queue',item);
 }
 updatePastoralQueue(id:string,changes:Partial<Pick<PastoralQueueItem,'priority'|'reason'|'stage'>>):Promise<{item:PastoralQueueItem}>{
   return this.send('PATCH',`/pastoral/queue/${encodeURIComponent(id)}`,changes);
 }
 pastoralSlots():Promise<{items:PastoralSlot[];pastor:string}>{
   return this.send('GET','/pastoral/slots');
 }
 updatePastoralSlot(id:string, changes:Partial<PastoralSlot>):Promise<{item:PastoralSlot}>{
   return this.send('PATCH',`/pastoral/slots/${encodeURIComponent(id)}`,changes);
 }
 async intercessionTemplates():Promise<IntercessionTemplate[]>{
   return (await this.send<{items:IntercessionTemplate[]}>('GET','/intercession/templates')).items;
 }
 updateIntercessionTemplate(id:string,num:number):Promise<{item:IntercessionTemplate}>{
   return this.send('PATCH',`/intercession/templates/${encodeURIComponent(id)}`,{people_per_service:num});
 }
 intercessionWeek(start:string):Promise<{templates:IntercessionTemplate[];items:IntercessionDraw[]}>{
   return this.send('GET',`/intercession/week?start=${encodeURIComponent(start)}`);
 }
 raffleIntercession(start:string):Promise<{items:{date:string;label:string;selected:number;required:number;draw_id:string}[];complete:boolean}>{
   return this.send('POST','/intercession/raffle',{start_date:start});
 }
 async intercessionCandidates(id:string,post:'pastores'|'bateria'):Promise<IntercessionCandidate[]>{
   return (await this.send<{items:IntercessionCandidate[]}>('GET',`/intercession/candidates?draw_id=${encodeURIComponent(id)}&post=${post}`)).items;
 }
 confirmIntercessor(id:string,status:'proposed'|'confirmed'|'declined'):Promise<{ok:boolean}>{
   return this.send('PATCH',`/intercession/assignments/${encodeURIComponent(id)}`,{status});
 }
 replaceIntercessionPost(draw:string,post:'pastores'|'bateria',people:[string,string]):Promise<{ok:boolean}>{
   return this.send('POST',`/intercession/draws/${encodeURIComponent(draw)}/replace`,{service_post:post,deacon_ids:people});
 }
  publishIntercession(id:string):Promise<{ok:boolean}>{
   return this.send('POST',`/intercession/draws/${encodeURIComponent(id)}/publish`,{});
 }

}