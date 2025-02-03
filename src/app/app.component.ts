import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet,CommonModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'xl-reader';
  fileName: string = ''; 
  errors: string[] = []; 
  fileData: any[] = [];  

  onFileUpload(event: any) {
    const file = event.target.files[0]; 
    if (file) {
      this.fileName = file.name;
      const reader = new FileReader();
  
      reader.onload = (e: any) => {
        const arrayBuffer = e.target.result; 
        const wb = XLSX.read(arrayBuffer, { type: 'array' }); 
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(ws, { header: 1 }); 
        this.fileData = json.slice(1); 
        this.validateData(this.fileData); 
      };
  
      reader.readAsArrayBuffer(file); 
    }
  }
  

  validateData(data: any[]) {
    const errors: string[] = [];
    const reportedUsers = new Set();
    const userMap = new Map(); 
  
    data.forEach((row: any) => {
      const [email, fullName, role, reportsTo] = row;
  
      if (role !== 'Root' && (!reportsTo || reportsTo.trim() === '')) {
        errors.push(`Row with ${email} does not have a valid 'ReportsTo' field.`);
        return;
      }

      if (reportsTo) {
        const reportToEmails = reportsTo.split(';');
        reportToEmails.forEach((parentEmail: any) => {
          if (userMap.has(parentEmail)) {
            if (userMap.get(parentEmail).reportsTo.includes(email)) {
              errors.push(`Cycle detected: ${email} reports to ${parentEmail}, forming a cycle.`);
            }
          }
        });
      }
  

      switch (role) {
        case 'Root':

          if (reportsTo) {
            errors.push(`Root user ${email} cannot have a 'ReportsTo' field.`);
          }
          break;
        case 'Admin':

          if (reportsTo && reportsTo !== 'mr.goyal@example.com') {
            errors.push(`Admin user ${email} should report to Root (mr.goyal@example.com).`);
          }
          break;
        case 'Manager':

          if (reportsTo && !['Admin', 'Manager'].includes(userMap.get(reportsTo)?.role)) {
            errors.push(`Manager user ${email} cannot report to a Caller or Root.`);
          }
          break;
        case 'Caller':

          if (reportsTo && userMap.get(reportsTo)?.role !== 'Manager') {
            errors.push(`Caller user ${email} can only report to a Manager.`);
          }
          break;
        default:
          break;
      }

      userMap.set(email, { role, reportsTo: reportsTo || '' });

      if (reportsTo && reportsTo.includes(';')) {
        errors.push(`User ${email} reports to multiple users, which is not allowed.`);
      }
    });
  
    this.errors =errors
  }
  
}
