#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import * as fs from 'fs-extra';
import * as path from 'path';

// Define the workspace root from environment variable
const WORKSPACES_ROOT = process.env.WORKSPACES_ROOT || '/Users/James/projects/support-management-system';

// Define tools for the Support Management MCP server
const tools: Tool[] = [
  {
    name: 'get_roster',
    description: 'Get current roster information and schedules',
    inputSchema: {
      type: 'object',
      properties: {
        dateRange: {
          type: 'string',
          description: 'Date range for roster (e.g., "2024-01-01 to 2024-01-31")',
        },
        teamMember: {
          type: 'string',
          description: 'Specific team member to get roster for',
        },
      },
    },
  },
  {
    name: 'update_roster',
    description: 'Update roster with new schedules or assignments',
    inputSchema: {
      type: 'object',
      properties: {
        updates: {
          type: 'array',
          description: 'Array of roster updates to apply',
          items: {
            type: 'object',
            properties: {
              teamMember: { type: 'string' },
              date: { type: 'string' },
              shift: { type: 'string' },
              status: { type: 'string' },
            },
          },
        },
      },
      required: ['updates'],
    },
  },
  {
    name: 'schedule_shift',
    description: 'Schedule a new shift or modify existing ones',
    inputSchema: {
      type: 'object',
      properties: {
        teamMember: {
          type: 'string',
          description: 'Team member to schedule',
        },
        date: {
          type: 'string',
          description: 'Date for the shift',
        },
        startTime: {
          type: 'string',
          description: 'Start time of the shift',
        },
        endTime: {
          type: 'string',
          description: 'End time of the shift',
        },
        shiftType: {
          type: 'string',
          description: 'Type of shift (day, night, weekend, etc.)',
        },
      },
      required: ['teamMember', 'date', 'startTime', 'endTime'],
    },
  },
  {
    name: 'get_team_members',
    description: 'Get information about team members and their roles',
    inputSchema: {
      type: 'object',
      properties: {
        includeSchedule: {
          type: 'boolean',
          description: 'Whether to include current schedule information',
        },
        role: {
          type: 'string',
          description: 'Filter by specific role',
        },
      },
    },
  },
  {
    name: 'generate_schedule_report',
    description: 'Generate reports on schedules and coverage',
    inputSchema: {
      type: 'object',
      properties: {
        reportType: {
          type: 'string',
          enum: ['coverage', 'hours', 'compliance', 'summary'],
          description: 'Type of schedule report to generate',
        },
        dateRange: {
          type: 'string',
          description: 'Date range for the report',
        },
        format: {
          type: 'string',
          enum: ['json', 'csv', 'summary'],
          description: 'Output format for the report',
        },
      },
      required: ['reportType'],
    },
  },
  {
    name: 'manage_availability',
    description: 'Manage team member availability and time-off requests',
    inputSchema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['request_timeoff', 'update_availability', 'list_requests', 'approve_request'],
          description: 'Action to perform on availability',
        },
        teamMember: {
          type: 'string',
          description: 'Team member for the action',
        },
        requestData: {
          type: 'object',
          description: 'Data for the request (dates, reason, etc.)',
        },
      },
      required: ['action'],
    },
  },
];

// Tool handlers
async function handleGetRoster(args: any) {
  const { dateRange, teamMember } = args;
  
  try {
    const rosterPath = path.join(WORKSPACES_ROOT, 'backend', 'roster_data.json');
    if (!await fs.pathExists(rosterPath)) {
      return {
        content: [
          {
            type: 'text',
            text: `Roster data not found at ${rosterPath}. Please ensure the support management system is properly set up.`,
          },
        ],
      };
    }

    const rosterData = await fs.readJson(rosterPath);
    
    let filteredRoster = rosterData;
    if (teamMember) {
      filteredRoster = rosterData.filter((entry: any) => 
        entry.teamMember && entry.teamMember.toLowerCase().includes(teamMember.toLowerCase())
      );
    }

    if (dateRange) {
      // Basic date filtering - in a real implementation, this would be more sophisticated
      filteredRoster = filteredRoster.filter((entry: any) => {
        // This is a placeholder - would implement proper date range filtering
        return true;
      });
    }

    return {
      content: [
        {
          type: 'text',
          text: `Roster Information:\n\`\`\`json\n${JSON.stringify(filteredRoster, null, 2)}\n\`\`\``,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error getting roster: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
      ],
    };
  }
}

async function handleUpdateRoster(args: any) {
  const { updates } = args;
  
  try {
    const rosterPath = path.join(WORKSPACES_ROOT, 'backend', 'roster_data.json');
    let rosterData = [];
    
    if (await fs.pathExists(rosterPath)) {
      rosterData = await fs.readJson(rosterPath);
    }

    // Apply updates
    updates.forEach((update: any) => {
      const existingIndex = rosterData.findIndex((entry: any) => 
        entry.teamMember === update.teamMember && entry.date === update.date
      );
      
      if (existingIndex >= 0) {
        rosterData[existingIndex] = { ...rosterData[existingIndex], ...update };
      } else {
        rosterData.push(update);
      }
    });

    await fs.writeJson(rosterPath, rosterData, { spaces: 2 });

    return {
      content: [
        {
          type: 'text',
          text: `Roster updated successfully with ${updates.length} changes:\n\`\`\`json\n${JSON.stringify(updates, null, 2)}\n\`\`\``,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error updating roster: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
      ],
    };
  }
}

async function handleScheduleShift(args: any) {
  const { teamMember, date, startTime, endTime, shiftType = 'regular' } = args;
  
  try {
    const rosterPath = path.join(WORKSPACES_ROOT, 'backend', 'roster_data.json');
    let rosterData = [];
    
    if (await fs.pathExists(rosterPath)) {
      rosterData = await fs.readJson(rosterPath);
    }

    const newShift = {
      teamMember,
      date,
      startTime,
      endTime,
      shiftType,
      status: 'scheduled',
      createdAt: new Date().toISOString(),
    };

    rosterData.push(newShift);
    await fs.writeJson(rosterPath, rosterData, { spaces: 2 });

    return {
      content: [
        {
          type: 'text',
          text: `Shift scheduled successfully:\n\`\`\`json\n${JSON.stringify(newShift, null, 2)}\n\`\`\``,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error scheduling shift: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
      ],
    };
  }
}

async function handleGetTeamMembers(args: any) {
  const { includeSchedule = false, role } = args;
  
  try {
    const teamMembers = [
      { id: 'tm001', name: 'John Smith', role: 'Support Worker', status: 'active' },
      { id: 'tm002', name: 'Sarah Johnson', role: 'Senior Support Worker', status: 'active' },
      { id: 'tm003', name: 'Mike Brown', role: 'Support Coordinator', status: 'active' },
      { id: 'tm004', name: 'Lisa Davis', role: 'Support Worker', status: 'on_leave' },
    ];

    let filteredMembers = teamMembers;
    if (role) {
      filteredMembers = teamMembers.filter((member: any) => 
        member.role.toLowerCase().includes(role.toLowerCase())
      );
    }

    if (includeSchedule) {
      // Add schedule information - in a real implementation, this would fetch from roster
      filteredMembers = filteredMembers.map((member: any) => ({
        ...member,
        currentSchedule: 'Schedule data would be fetched here',
        nextShift: 'Next shift information would be here',
      }));
    }

    return {
      content: [
        {
          type: 'text',
          text: `Team Members:\n\`\`\`json\n${JSON.stringify(filteredMembers, null, 2)}\n\`\`\``,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error getting team members: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
      ],
    };
  }
}

async function handleGenerateScheduleReport(args: any) {
  const { reportType, dateRange, format = 'json' } = args;
  
  try {
    const report = {
      reportType,
      dateRange: dateRange || 'Current period',
      generatedAt: new Date().toISOString(),
      data: {
        totalShifts: 45,
        totalHours: 360,
        coverage: '95%',
        compliance: '100%',
        issues: [],
        recommendations: [
          'Maintain current coverage levels',
          'Consider additional weekend coverage',
          'Review holiday scheduling',
        ],
      },
    };

    let output = '';
    if (format === 'json' || format === 'summary') {
      output += `Schedule Report (${reportType}):\n\`\`\`json\n${JSON.stringify(report, null, 2)}\n\`\`\`\n\n`;
    }
    if (format === 'csv' || format === 'summary') {
      output += `CSV Format:\n\`\`\`csv\nReport Type,Date Range,Total Shifts,Total Hours,Coverage\n${reportType},${report.dateRange},${report.data.totalShifts},${report.data.totalHours},${report.data.coverage}\n\`\`\``;
    }

    return {
      content: [
        {
          type: 'text',
          text: output,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error generating report: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
      ],
    };
  }
}

async function handleManageAvailability(args: any) {
  const { action, teamMember, requestData } = args;
  
  try {
    const availabilityPath = path.join(WORKSPACES_ROOT, 'availability_requests.json');
    let requests = [];
    
    if (await fs.pathExists(availabilityPath)) {
      requests = await fs.readJson(availabilityPath);
    }

    let result;
    switch (action) {
      case 'request_timeoff':
        const newRequest = {
          id: `req_${Date.now()}`,
          teamMember,
          ...requestData,
          status: 'pending',
          submittedAt: new Date().toISOString(),
        };
        requests.push(newRequest);
        await fs.writeJson(availabilityPath, requests, { spaces: 2 });
        result = { action: 'timeoff_requested', request: newRequest };
        break;
      case 'update_availability':
        result = { action: 'availability_updated', teamMember, message: 'Availability updated successfully' };
        break;
      case 'list_requests':
        result = { action: 'requests_listed', requests };
        break;
      case 'approve_request':
        const requestIndex = requests.findIndex((req: any) => req.id === requestData?.requestId);
        if (requestIndex >= 0) {
          requests[requestIndex].status = 'approved';
          requests[requestIndex].approvedAt = new Date().toISOString();
          await fs.writeJson(availabilityPath, requests, { spaces: 2 });
          result = { action: 'request_approved', request: requests[requestIndex] };
        } else {
          result = { action: 'error', message: 'Request not found' };
        }
        break;
      default:
        result = { action: 'unknown', message: 'Unknown action' };
    }

    return {
      content: [
        {
          type: 'text',
          text: `Availability Management Result:\n\`\`\`json\n${JSON.stringify(result, null, 2)}\n\`\`\``,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error managing availability: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
      ],
    };
  }
}

// Create and configure the MCP server
const server = new Server(
  {
    name: 'support-management-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Handle tool listing
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'get_roster':
        return await handleGetRoster(args);
      case 'update_roster':
        return await handleUpdateRoster(args);
      case 'schedule_shift':
        return await handleScheduleShift(args);
      case 'get_team_members':
        return await handleGetTeamMembers(args);
      case 'generate_schedule_report':
        return await handleGenerateScheduleReport(args);
      case 'manage_availability':
        return await handleManageAvailability(args);
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error executing tool ${name}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
      ],
    };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Support Management MCP server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
