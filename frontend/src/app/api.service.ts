import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

declare global { interface Window { __DIACONATO_CONFIG__?: { apiUrl: string } } }
export type Role = 'admin'|'coordinator'|'leader';
export type Cohort = 'antigo'|'novo';
export type DeaconStatus = 'active'|'away'|'inactive';
export interface User { id: string; name: string; email: string; role: Role; active?: boolean }
export interface Deacon { id: string; full_name: string; cohort: Cohort; status: DeaconStatus; phone?: string; email?: string; availability?: string; group_id?: string; group_name?: string; last_contact?: string }
export interface Group { id: string; name: string; leader_id: string|null; leader_name: string|null; members: number; target_size: number }
export interface Followup { id: string; contacted_at: string; author: string; method: string; outcome: string; summary: string; next_contact_on?: string; needs_pastoral_attention: boolean }
export type AttendanceStatus = 'present'|'unable'|'unreported';
export interface DiscipleshipMeeting { id:string; title:string; scheduled_at:string; location?:string; status:'planned'|'completed'|'cancelled'; present_count:number; unable_count:number }
export interface DiscipleshipAttendance { deacon_id:string; full_name:string; cohort:Cohort; deacon_status:DeaconStatus; attendance:AttendanceStatus }
export interface Dashboard { totals: {deacons:number;without_group:number;contacted_30_days:number;without_recent_contact:number};groups:Group[] }
@Injectable({providedIn:'root'})
export class ApiService {
 private http=inject(HttpClient);
 readonly apiUrl=(window.__DIACONATO_CONFIG__?.apiUrl ?? (location.hostname === 'localhost' ? 'http://localhost:8080' : '')).replace(/\/$/,'');
 user:User|null=null;
 get token():string|null{return sessionStorage.getItem('diaconato_access_token')}
 get authorized():boolean{return !!this.token}
 private headers():HttpHeaders{return new HttpHeaders(this.token?{'Authorization':`Bearer ${this.token}`}:{})}
 private async send<T>(method:'GET'|'POST'|'PATCH',path:string,body?:unknown):Promise<T>{
   if (!this.apiUrl) throw new Error('A API ainda não foi configurada. Aguarde a ativação do servidor PHP.');
   try {return await firstValueFrom(this.http.request<T>(method,this.apiUrl+path,{headers:this.headers(),body})) as T}
   catch(e){if(e instanceof HttpErrorResponse){if(e.status===401){this.clear()}throw Error(e.error?.error||`Falha de comunicação (${e.status||'rede'}).`)}throw e}
 }
 clear():void{sessionStorage.removeItem('diaconato_access_token');this.user=null}
 async login(email:string,password:string):Promise<User>{const result=await this.send<{user:User;token:string}>('POST','/auth/login',{email,password});sessionStorage.setItem('diaconato_access_token',result.token);this.user=result.user;return result.user}
 async me():Promise<User>{const x=await this.send<{user:User}>('GET','/auth/me');this.user=x.user;return x.user}
 async logout():Promise<void>{try{await this.send('POST','/auth/logout',{})}finally{this.clear()}}
 dashboard():Promise<Dashboard>{return this.send('GET','/dashboard')}
 async deacons():Promise<Deacon[]>{return (await this.send<{items:Deacon[]}>('GET','/deacons')).items}
 createDeacon(d:unknown):Promise<{id:string}>{return this.send('POST','/deacons',d)}
 updateDeacon(id:string,d:unknown):Promise<{ok:boolean}>{return this.send('PATCH',`/deacons/${encodeURIComponent(id)}`,d)}
 async groups():Promise<Group[]>{return (await this.send<{items:Group[]}>('GET','/groups')).items}
 createGroup(g:unknown):Promise<{id:string}>{return this.send('POST','/groups',g)}
 updateGroup(id:string,g:unknown):Promise<{ok:boolean}>{return this.send('PATCH',`/groups/${encodeURIComponent(id)}`,g)}
 assign(group:string,deacon:string):Promise<{ok:boolean}>{return this.send('POST',`/groups/${encodeURIComponent(group)}/members`,{deacon_id:deacon})}
 async users():Promise<User[]>{return (await this.send<{items:User[]}>('GET','/users')).items}
 createUser(u:unknown):Promise<{item:User}>{return this.send('POST','/users',u)}
 async followups(deaconId:string):Promise<Followup[]>{return (await this.send<{items:Followup[]}>('GET',`/followups?deacon_id=${encodeURIComponent(deaconId)}`)).items}
 createFollowup(f:unknown):Promise<{id:string}>{return this.send('POST','/followups',f)}
 async discipleships():Promise<DiscipleshipMeeting[]>{return (await this.send<{items:DiscipleshipMeeting[]}>('GET','/discipleships')).items}
 createDiscipleship(data:{title:string;scheduled_at:string;location:string}):Promise<{id:string}>{return this.send('POST','/discipleships',data)}
 async discipleshipAttendance(meetingId:string):Promise<DiscipleshipAttendance[]>{return (await this.send<{items:DiscipleshipAttendance[]}>('GET',`/discipleships/${encodeURIComponent(meetingId)}/attendance`)).items}
 setDiscipleshipAttendance(meetingId:string,deaconId:string,attendance:AttendanceStatus):Promise<{ok:boolean}>{
  return this.send('POST',`/discipleships/${encodeURIComponent(meetingId)}/attendance`,{deacon_id:deaconId,attendance});
 }
}