import { z } from 'zod';
import { 
  insertUserSchema, users,
  insertClientSchema, clients,
  insertServiceSchema, services,
  insertLeadSchema, leads,
  insertJobSchema, jobs,
  insertWorkOrderSchema, workOrders,
  insertInventorySchema, inventory,
  insertTransactionSchema, transactions,
  insertSettingSchema, settings
} from './schema';

export const errorSchemas = {
  validation: z.object({ message: z.string(), field: z.string().optional() }),
  notFound: z.object({ message: z.string() }),
  internal: z.object({ message: z.string() }),
};

export const publicUserSchema = z.object({
  id: z.number(),
  username: z.string(),
  role: z.string(),
  createdAt: z.any().optional(),
  roleId: z.number().nullable().optional(),
  jobTitle: z.string().nullable().optional(),
  permissions: z.record(z.boolean()).optional(),
  roleName: z.string().nullable().optional(),
  roleLabel: z.string().nullable().optional(),
  fullName: z.string().nullable().optional(),
  status: z.string().optional(),
  mustChangePassword: z.boolean().optional(),
});

export const api = {
  auth: {
    login: {
      method: 'POST' as const,
      path: '/api/auth/login' as const,
      input: z.object({ username: z.string(), password: z.string() }),
      responses: {
        200: publicUserSchema,
        401: errorSchemas.validation,
      }
    },
    me: {
      method: 'GET' as const,
      path: '/api/auth/me' as const,
      responses: {
        200: publicUserSchema,
        401: errorSchemas.validation,
      }
    },
    logout: {
      method: 'POST' as const,
      path: '/api/auth/logout' as const,
      responses: {
        200: z.object({ message: z.string() })
      }
    }
  },
  dashboard: {
    metrics: {
      method: 'GET' as const,
      path: '/api/dashboard/metrics' as const,
      responses: {
        200: z.object({
          monthlyRevenue: z.number(),
          monthlyProfit: z.number(),
          averageMargin: z.number(),
          jobsInProgress: z.number(),
          newLeads: z.number(),
          conversionRate: z.number(),
          cashBalance: z.number(),
        })
      }
    }
  },
  clients: {
    list: {
      method: 'GET' as const,
      path: '/api/clients' as const,
      responses: { 200: z.array(z.custom<typeof clients.$inferSelect>()) }
    },
    get: {
      method: 'GET' as const,
      path: '/api/clients/:id' as const,
      responses: { 200: z.custom<typeof clients.$inferSelect>(), 404: errorSchemas.notFound }
    },
    create: {
      method: 'POST' as const,
      path: '/api/clients' as const,
      input: insertClientSchema,
      responses: { 201: z.custom<typeof clients.$inferSelect>(), 400: errorSchemas.validation }
    },
    update: {
      method: 'PUT' as const,
      path: '/api/clients/:id' as const,
      input: insertClientSchema.partial(),
      responses: { 200: z.custom<typeof clients.$inferSelect>(), 404: errorSchemas.notFound }
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/clients/:id' as const,
      responses: { 204: z.void(), 404: errorSchemas.notFound }
    }
  },
  services: {
    list: {
      method: 'GET' as const,
      path: '/api/services' as const,
      responses: { 200: z.array(z.custom<typeof services.$inferSelect>()) }
    },
    get: {
      method: 'GET' as const,
      path: '/api/services/:id' as const,
      responses: { 200: z.custom<typeof services.$inferSelect>(), 404: errorSchemas.notFound }
    },
    create: {
      method: 'POST' as const,
      path: '/api/services' as const,
      input: insertServiceSchema,
      responses: { 201: z.custom<typeof services.$inferSelect>(), 400: errorSchemas.validation }
    },
    update: {
      method: 'PUT' as const,
      path: '/api/services/:id' as const,
      input: insertServiceSchema.partial(),
      responses: { 200: z.custom<typeof services.$inferSelect>(), 404: errorSchemas.notFound }
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/services/:id' as const,
      responses: { 204: z.void(), 404: errorSchemas.notFound }
    }
  },
  leads: {
    list: {
      method: 'GET' as const,
      path: '/api/leads' as const,
      responses: { 200: z.array(z.custom<typeof leads.$inferSelect>()) }
    },
    create: {
      method: 'POST' as const,
      path: '/api/leads' as const,
      input: insertLeadSchema,
      responses: { 201: z.custom<typeof leads.$inferSelect>(), 400: errorSchemas.validation }
    },
    update: {
      method: 'PUT' as const,
      path: '/api/leads/:id' as const,
      input: insertLeadSchema.partial(),
      responses: { 200: z.custom<typeof leads.$inferSelect>(), 404: errorSchemas.notFound }
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/leads/:id' as const,
      responses: { 204: z.void(), 404: errorSchemas.notFound }
    }
  },
  jobs: {
    list: {
      method: 'GET' as const,
      path: '/api/jobs' as const,
      responses: { 200: z.array(z.custom<typeof jobs.$inferSelect>()) }
    },
    get: {
      method: 'GET' as const,
      path: '/api/jobs/:id' as const,
      responses: { 200: z.custom<typeof jobs.$inferSelect>(), 404: errorSchemas.notFound }
    },
    create: {
      method: 'POST' as const,
      path: '/api/jobs' as const,
      input: insertJobSchema,
      responses: { 201: z.custom<typeof jobs.$inferSelect>(), 400: errorSchemas.validation }
    },
    update: {
      method: 'PUT' as const,
      path: '/api/jobs/:id' as const,
      input: insertJobSchema.partial(),
      responses: { 200: z.custom<typeof jobs.$inferSelect>(), 404: errorSchemas.notFound }
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/jobs/:id' as const,
      responses: { 204: z.void(), 404: errorSchemas.notFound }
    }
  },
  workOrders: {
    list: {
      method: 'GET' as const,
      path: '/api/work-orders' as const,
      responses: { 200: z.array(z.custom<typeof workOrders.$inferSelect>()) }
    },
    get: {
      method: 'GET' as const,
      path: '/api/work-orders/:id' as const,
      responses: { 200: z.custom<typeof workOrders.$inferSelect>(), 404: errorSchemas.notFound }
    },
    create: {
      method: 'POST' as const,
      path: '/api/work-orders' as const,
      input: insertWorkOrderSchema,
      responses: { 201: z.custom<typeof workOrders.$inferSelect>(), 400: errorSchemas.validation }
    },
    update: {
      method: 'PUT' as const,
      path: '/api/work-orders/:id' as const,
      input: insertWorkOrderSchema.partial(),
      responses: { 200: z.custom<typeof workOrders.$inferSelect>(), 404: errorSchemas.notFound }
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/work-orders/:id' as const,
      responses: { 204: z.void(), 404: errorSchemas.notFound }
    }
  },
  inventory: {
    list: {
      method: 'GET' as const,
      path: '/api/inventory' as const,
      responses: { 200: z.array(z.custom<typeof inventory.$inferSelect>()) }
    },
    create: {
      method: 'POST' as const,
      path: '/api/inventory' as const,
      input: insertInventorySchema,
      responses: { 201: z.custom<typeof inventory.$inferSelect>(), 400: errorSchemas.validation }
    },
    update: {
      method: 'PUT' as const,
      path: '/api/inventory/:id' as const,
      input: insertInventorySchema.partial(),
      responses: { 200: z.custom<typeof inventory.$inferSelect>(), 404: errorSchemas.notFound }
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/inventory/:id' as const,
      responses: { 204: z.void(), 404: errorSchemas.notFound }
    }
  },
  transactions: {
    list: {
      method: 'GET' as const,
      path: '/api/transactions' as const,
      responses: { 200: z.array(z.custom<typeof transactions.$inferSelect>()) }
    },
    create: {
      method: 'POST' as const,
      path: '/api/transactions' as const,
      input: insertTransactionSchema,
      responses: { 201: z.custom<typeof transactions.$inferSelect>(), 400: errorSchemas.validation }
    }
  },
  settings: {
    list: {
      method: 'GET' as const,
      path: '/api/settings' as const,
      responses: { 200: z.array(z.custom<typeof settings.$inferSelect>()) }
    },
    updateBulk: {
      method: 'POST' as const,
      path: '/api/settings/bulk' as const,
      input: z.object({ settings: z.array(z.object({ key: z.string(), value: z.number() })) }),
      responses: { 200: z.array(z.custom<typeof settings.$inferSelect>()) }
    }
  }
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
