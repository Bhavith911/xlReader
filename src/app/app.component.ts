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
  fileName: string = ''; // To store the name of the uploaded file
  errors: string[] = []; // To store validation errors
  fileData: any[] = [];  // To store the data from the Excel file

  onFileUpload(event: any) {
    const file = event.target.files[0]; // Get the selected file
    if (file) {
      this.fileName = file.name; // Store the file name
      const reader = new FileReader();
  
      reader.onload = (e: any) => {
        const arrayBuffer = e.target.result; // Get the ArrayBuffer
        const wb = XLSX.read(arrayBuffer, { type: 'array' }); // Parse the ArrayBuffer content
        const ws = wb.Sheets[wb.SheetNames[0]]; // Get the first sheet of the Excel file
        const json = XLSX.utils.sheet_to_json(ws, { header: 1 }); // Convert sheet data to JSON
  
        this.fileData = json.slice(1); // Remove headers
        this.validateData(this.fileData); // Validate the data
      };
  
      reader.readAsArrayBuffer(file); // Read the file as ArrayBuffer
    }
  }
  

  validateData(data: any[]) {
    const errors: string[] = [];
    const reportedUsers = new Set(); // To track users who have already reported to a parent
    const userMap = new Map(); // To store users by email for easy lookup
  
    data.forEach((row: any) => {
      const [email, fullName, role, reportsTo] = row;
  
      // Check if 'reportsTo' exists for users except 'Root'
      if (role !== 'Root' && (!reportsTo || reportsTo.trim() === '')) {
        errors.push(`Row with ${email} does not have a valid 'ReportsTo' field.`);
        return;
      }
  
      // Check for cycle detection (parent reports to the child)
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
  
      // Check hierarchy rules:
      switch (role) {
        case 'Root':
          // Root can only report to no one
          if (reportsTo) {
            errors.push(`Root user ${email} cannot have a 'ReportsTo' field.`);
          }
          break;
        case 'Admin':
          // Admin can only report to Root
          if (reportsTo && reportsTo !== 'mr.goyal@example.com') {
            errors.push(`Admin user ${email} should report to Root (mr.goyal@example.com).`);
          }
          break;
        case 'Manager':
          // Manager can only report to another manager or admin
          if (reportsTo && !['Admin', 'Manager'].includes(userMap.get(reportsTo)?.role)) {
            errors.push(`Manager user ${email} cannot report to a Caller or Root.`);
          }
          break;
        case 'Caller':
          // Caller can only report to a Manager
          if (reportsTo && userMap.get(reportsTo)?.role !== 'Manager') {
            errors.push(`Caller user ${email} can only report to a Manager.`);
          }
          break;
        default:
          break;
      }
  
      // Track the user in the map
      userMap.set(email, { role, reportsTo: reportsTo || '' });
  
      // Check if a user reports to multiple people
      if (reportsTo && reportsTo.includes(';')) {
        errors.push(`User ${email} reports to multiple users, which is not allowed.`);
      }
    });
  
    this.errors =errors
  }
  
}
