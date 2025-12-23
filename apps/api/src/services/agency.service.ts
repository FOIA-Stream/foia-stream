// ============================================
// FOIA Stream - Agency Service
// ============================================

import { and, eq, like, or, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { db, schema } from '../db';
import type { Agency, JurisdictionLevel, PaginationInfo } from '../types';

export interface CreateAgencyDTO {
  name: string;
  abbreviation?: string;
  jurisdictionLevel: JurisdictionLevel;
  state?: string;
  city?: string;
  county?: string;
  foiaEmail?: string;
  foiaAddress?: string;
  foiaPortalUrl?: string;
  responseDeadlineDays?: number;
  appealDeadlineDays?: number;
}

export interface AgencySearchFilters {
  query?: string;
  jurisdictionLevel?: JurisdictionLevel;
  state?: string;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: PaginationInfo;
}

export class AgencyService {
  /**
   * Create a new agency
   */
  async createAgency(data: CreateAgencyDTO): Promise<Agency> {
    const id = nanoid();
    const now = new Date().toISOString();

    await db.insert(schema.agencies).values({
      id,
      name: data.name,
      abbreviation: data.abbreviation,
      jurisdictionLevel: data.jurisdictionLevel,
      state: data.state,
      city: data.city,
      county: data.county,
      foiaEmail: data.foiaEmail,
      foiaAddress: data.foiaAddress,
      foiaPortalUrl: data.foiaPortalUrl,
      responseDeadlineDays: data.responseDeadlineDays ?? 20,
      appealDeadlineDays: data.appealDeadlineDays ?? 30,
      createdAt: now,
      updatedAt: now,
    });

    return this.getAgencyById(id) as Promise<Agency>;
  }

  /**
   * Get agency by ID
   */
  async getAgencyById(id: string): Promise<Agency | null> {
    const agency = await db.select().from(schema.agencies).where(eq(schema.agencies.id, id)).get();

    return agency as Agency | null;
  }

  /**
   * Search agencies
   */
  async searchAgencies(
    filters: AgencySearchFilters,
    page = 1,
    pageSize = 20,
  ): Promise<PaginatedResult<Agency>> {
    const offset = (page - 1) * pageSize;
    const conditions = [];

    if (filters.query) {
      conditions.push(
        or(
          like(schema.agencies.name, `%${filters.query}%`),
          like(schema.agencies.abbreviation, `%${filters.query}%`),
        ),
      );
    }

    if (filters.jurisdictionLevel) {
      conditions.push(eq(schema.agencies.jurisdictionLevel, filters.jurisdictionLevel));
    }

    if (filters.state) {
      conditions.push(eq(schema.agencies.state, filters.state));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [agencies, countResult] = await Promise.all([
      db
        .select()
        .from(schema.agencies)
        .where(whereClause)
        .orderBy(schema.agencies.name)
        .limit(pageSize)
        .offset(offset),
      db.select({ count: sql<number>`count(*)` }).from(schema.agencies).where(whereClause).get(),
    ]);

    const totalItems = countResult?.count ?? 0;

    return {
      data: agencies as Agency[],
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages: Math.ceil(totalItems / pageSize),
      },
    };
  }

  /**
   * Get agencies by jurisdiction level
   */
  async getAgenciesByJurisdiction(
    jurisdictionLevel: JurisdictionLevel,
    state?: string,
  ): Promise<Agency[]> {
    const conditions = [eq(schema.agencies.jurisdictionLevel, jurisdictionLevel)];

    if (state) {
      conditions.push(eq(schema.agencies.state, state));
    }

    const agencies = await db
      .select()
      .from(schema.agencies)
      .where(and(...conditions))
      .orderBy(schema.agencies.name);

    return agencies as Agency[];
  }

  /**
   * Get agency statistics
   */
  async getAgencyStats(agencyId: string) {
    const stats = await db
      .select()
      .from(schema.agencyStats)
      .where(eq(schema.agencyStats.agencyId, agencyId))
      .get();

    return stats;
  }

  /**
   * Update agency
   */
  async updateAgency(id: string, data: Partial<CreateAgencyDTO>): Promise<Agency> {
    const now = new Date().toISOString();

    await db
      .update(schema.agencies)
      .set({
        ...data,
        updatedAt: now,
      })
      .where(eq(schema.agencies.id, id));

    return this.getAgencyById(id) as Promise<Agency>;
  }

  /**
   * Get US states list for filtering
   */
  getUSStates(): { code: string; name: string }[] {
    return [
      { code: 'AL', name: 'Alabama' },
      { code: 'AK', name: 'Alaska' },
      { code: 'AZ', name: 'Arizona' },
      { code: 'AR', name: 'Arkansas' },
      { code: 'CA', name: 'California' },
      { code: 'CO', name: 'Colorado' },
      { code: 'CT', name: 'Connecticut' },
      { code: 'DE', name: 'Delaware' },
      { code: 'FL', name: 'Florida' },
      { code: 'GA', name: 'Georgia' },
      { code: 'HI', name: 'Hawaii' },
      { code: 'ID', name: 'Idaho' },
      { code: 'IL', name: 'Illinois' },
      { code: 'IN', name: 'Indiana' },
      { code: 'IA', name: 'Iowa' },
      { code: 'KS', name: 'Kansas' },
      { code: 'KY', name: 'Kentucky' },
      { code: 'LA', name: 'Louisiana' },
      { code: 'ME', name: 'Maine' },
      { code: 'MD', name: 'Maryland' },
      { code: 'MA', name: 'Massachusetts' },
      { code: 'MI', name: 'Michigan' },
      { code: 'MN', name: 'Minnesota' },
      { code: 'MS', name: 'Mississippi' },
      { code: 'MO', name: 'Missouri' },
      { code: 'MT', name: 'Montana' },
      { code: 'NE', name: 'Nebraska' },
      { code: 'NV', name: 'Nevada' },
      { code: 'NH', name: 'New Hampshire' },
      { code: 'NJ', name: 'New Jersey' },
      { code: 'NM', name: 'New Mexico' },
      { code: 'NY', name: 'New York' },
      { code: 'NC', name: 'North Carolina' },
      { code: 'ND', name: 'North Dakota' },
      { code: 'OH', name: 'Ohio' },
      { code: 'OK', name: 'Oklahoma' },
      { code: 'OR', name: 'Oregon' },
      { code: 'PA', name: 'Pennsylvania' },
      { code: 'RI', name: 'Rhode Island' },
      { code: 'SC', name: 'South Carolina' },
      { code: 'SD', name: 'South Dakota' },
      { code: 'TN', name: 'Tennessee' },
      { code: 'TX', name: 'Texas' },
      { code: 'UT', name: 'Utah' },
      { code: 'VT', name: 'Vermont' },
      { code: 'VA', name: 'Virginia' },
      { code: 'WA', name: 'Washington' },
      { code: 'WV', name: 'West Virginia' },
      { code: 'WI', name: 'Wisconsin' },
      { code: 'WY', name: 'Wyoming' },
      { code: 'DC', name: 'District of Columbia' },
    ];
  }
}

export const agencyService = new AgencyService();
