import { Component, OnInit } from '@angular/core';
import { UserService, User } from '../services/user.service';
import { State } from '@progress/kendo-data-query';
import { DataStateChangeEvent } from '@progress/kendo-angular-grid';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
})
export class DashboardComponent implements OnInit {
  users: User[] = [];
  totalUsers: number = 0;
  dataManagerCount: number = 0;
  employeeCount: number = 0;
  adminCount: number = 0;
  firstName: string = '';

  // Kendo Grid settings
  gridData: any = { data: [], total: 0 };
  body: any = {
    page: 1,
    sorts: null,
    filters: null,
    limit: 10,
  };

  // Kendo Grid state
  public state: State = {
    skip: 0,
    take: 10,
    sort: [],
    filter: {
      logic: 'and',
      filters: [],
    },
  };

  constructor(
    private userService: UserService,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.setUserFirstName();
    this.loadUsers();
    this.loadRoleStatistics();
  }

  // Retrieve the first name of the logged-in user
  private setUserFirstName(): void {
    const currentUserData = localStorage.getItem('currentUser');
    this.firstName = currentUserData
      ? JSON.parse(currentUserData).name.split(' ')[0]
      : 'User';
  }

  // Fetch users with current pagination, filtering, and sorting
  private loadUsers(): void {
    console.log('Request payload for users:', this.body);

    this.userService.getAllUsers(this.body).subscribe({
      next: (response: any) => {
        if (response.rows && Array.isArray(response.rows)) {
          this.users = response.rows; // Access rows directly
          this.gridData = {
            data: this.users, // Assign the users to grid data
            total: response.count || this.users.length, // Access count directly
          };
          // console.log('Loaded users:', this.gridData);
        } else {
          console.error('Unexpected response format:', response);
        }
      },
      error: (error) => {
        // Log the error message coming from the service
        console.log('Error message:', error.message);
        console.error('Error object:', error);

        if (error.message === 'No users found.') {
          this.users = [];
          this.gridData = { data: [], total: 0 };
          this.toastr.error('No Matching Records Found.');
        } else {
          this.toastr.error('An error occurred while fetching users.');
        }
      },
    });
  }

  // Fetch role statistics
  private loadRoleStatistics(): void {
    this.userService.getRoleStatistics().subscribe({
      next: (stats) => {
        this.dataManagerCount = stats.datamanagerCount;
        this.employeeCount = stats.employeeCount;
        this.adminCount = stats.adminCount;
        console.log('Role statistics:', stats);
        this.calculateTotalUsers(); // update total users count
      },
      error: (error) => {
        console.error('Failed to fetch role statistics:', error);
      },
    });
  }

  // Calculate total users count
  private calculateTotalUsers(): void {
    this.totalUsers =
      this.dataManagerCount + this.employeeCount + this.adminCount;
  }

  // Handle state changes for Kendo Grid (pagination, sorting, filtering)
  public dataStateChange(state: DataStateChangeEvent): void {
    this.state = state;
    console.log('Current state:', state);
    this.body.page = Math.floor(state.skip / state.take) + 1; // Calculate current page
    this.body.limit = state.take;

    // Apply sorting
    this.body.sorts =
      state.sort?.map((sortElement) => ({
        field: sortElement.field,
        dir: sortElement.dir,
      })) || null;

    // Apply filtering
    this.body.filters =
      state.filter?.filters
        ?.flatMap((item: any) => item.filters || [])
        .map((filter: any) => ({
          field: filter.field,
          operator: filter.operator || 'contains', // Default operator
          value: filter.value,
        })) || null;

    console.log('Updated request payload:', this.body);

    // Reload users with updated state
    this.loadUsers();
  }
}
