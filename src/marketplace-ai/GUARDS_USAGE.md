# Authorization Guards Usage Guide

This document explains how to use the various authorization guards available in the marketplace-ai service.

## Overview

The service provides several guards to control access to endpoints based on user types and capabilities:

1. **JwtAuthGuard** - Basic authentication (user must be logged in)
2. **AdminGuard** - Admin users only
3. **GovernmentGuard** - Government users (GOV and ADMIN types)
4. **VendorGuard** - Vendor users only
5. **RolesGuard** - Flexible role-based access (with @Roles decorator)
6. **CapabilitiesGuard** - Capability-based access (with @RequireCapabilities decorator)

## User Types

- `VENDOR` - Vendor users (private sector)
- `GOV` - Government users (public sector employees)
- `ADMIN` - Administrative users (public sector with admin privileges)

## Basic Usage

### 1. Authentication Only (Any logged-in user)

```typescript
@Post('endpoint')
@UseGuards(JwtAuthGuard)
async myEndpoint(@CurrentUser() user: any) {
  // Any authenticated user can access
}
```

### 2. Admin Users Only

```typescript
@Post('admin-endpoint')
@UseGuards(JwtAuthGuard, AdminGuard)
async adminEndpoint(@CurrentUser() user: any) {
  // Only ADMIN users can access
}
```

### 3. Government Users Only (includes Admin)

```typescript
@Post('government-endpoint')
@UseGuards(JwtAuthGuard, GovernmentGuard)
async governmentEndpoint(@CurrentUser() user: any) {
  // GOV and ADMIN users can access
}
```

### 4. Vendor Users Only

```typescript
@Post('vendor-endpoint')
@UseGuards(JwtAuthGuard, VendorGuard)
async vendorEndpoint(@CurrentUser() user: any) {
  // Only VENDOR users can access
}
```

### 5. Flexible Role-Based Access

```typescript
@Post('multi-role-endpoint')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('GOV', 'ADMIN') // Specify allowed roles
async multiRoleEndpoint(@CurrentUser() user: any) {
  // GOV and ADMIN users can access
}

@Post('vendor-only-endpoint')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('VENDOR') // Single role
async vendorOnlyEndpoint(@CurrentUser() user: any) {
  // Only VENDOR users can access
}
```

### 6. Capability-Based Access

```typescript
@Post('sensitive-endpoint')
@UseGuards(JwtAuthGuard, CapabilitiesGuard)
@RequireCapabilities('SENSITIVE_DATA_ACCESS', 'ADVANCED_ANALYTICS')
async sensitiveEndpoint(@CurrentUser() user: any) {
  // User must have ALL specified capabilities
}
```

## Guard Combinations

You can combine multiple guards for complex authorization:

```typescript
@Post('complex-endpoint')
@UseGuards(JwtAuthGuard, AdminGuard, CapabilitiesGuard)
@RequireCapabilities('SUPER_ADMIN')
async complexEndpoint(@CurrentUser() user: any) {
  // Must be ADMIN user AND have SUPER_ADMIN capability
}
```

## Example Implementation

```typescript
import { Controller, Post, UseGuards, Body } from '@nestjs/common';
import {
  JwtAuthGuard,
  AdminGuard,
  GovernmentGuard,
  VendorGuard,
  RolesGuard,
  CapabilitiesGuard,
  Roles,
  RequireCapabilities
} from './auth/guards';
import { CurrentUser } from './auth/decorators/user.decorator';

@Controller('api')
export class MyController {

  // Public sector employees only
  @Post('procurement-data')
  @UseGuards(JwtAuthGuard, GovernmentGuard)
  async getProcurementData(@CurrentUser() user: any) {
    // Implementation for government users
  }

  // Vendors can submit proposals
  @Post('submit-proposal')
  @UseGuards(JwtAuthGuard, VendorGuard)
  async submitProposal(@CurrentUser() user: any, @Body() proposal: any) {
    // Implementation for vendor users
  }

  // Admin-only system management
  @Post('system-config')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async updateSystemConfig(@CurrentUser() user: any, @Body() config: any) {
    // Implementation for admin users only
  }

  // Flexible access for analysis features
  @Post('market-analysis')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('GOV', 'ADMIN')
  async analyzeMarket(@CurrentUser() user: any) {
    // Available to both government and admin users
  }

  // Capability-based sensitive operations
  @Post('financial-analysis')
  @UseGuards(JwtAuthGuard, CapabilitiesGuard)
  @RequireCapabilities('FINANCIAL_DATA_ACCESS', 'ANALYTICS')
  async analyzeFinancials(@CurrentUser() user: any) {
    // User must have specific capabilities
  }
}
```

## Error Responses

When authorization fails, users will receive:

- **403 Forbidden** with appropriate error messages:
  - "Admin access required"
  - "Government access required"
  - "Vendor access required"
  - "Access denied. Required roles: GOV, ADMIN"
  - "Access denied. Required capabilities: SENSITIVE_DATA_ACCESS, ADVANCED_ANALYTICS"

## Guard Order

Always use `JwtAuthGuard` first, followed by authorization guards:

```typescript
// ✅ Correct order
@UseGuards(JwtAuthGuard, AdminGuard)

// ❌ Wrong order - authorization guard won't have user data
@UseGuards(AdminGuard, JwtAuthGuard)
```

## Best Practices

1. **Use specific guards** when you know the exact user type (AdminGuard, GovernmentGuard, VendorGuard)
2. **Use RolesGuard** when you need flexibility or multiple user types
3. **Use CapabilitiesGuard** for fine-grained permissions based on user capabilities
4. **Combine guards** when you need both role and capability checks
5. **Always include JwtAuthGuard** as the first guard to ensure authentication
6. **Log user context** in sensitive operations for audit trails

## Import Statement

```typescript
import {
  JwtAuthGuard,
  AdminGuard,
  GovernmentGuard,
  VendorGuard,
  RolesGuard,
  CapabilitiesGuard,
  Roles,
  RequireCapabilities
} from './auth/guards';
```
