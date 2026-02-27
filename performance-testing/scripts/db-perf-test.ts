// ═══════════════════════════════════════════════════════════════════════════════
// Database Query Performance Testing
// DAFC OTB Platform — Measures Prisma query performance
//
// Run from backend/: npx ts-node ../performance-testing/scripts/db-perf-test.ts
// ═══════════════════════════════════════════════════════════════════════════════

import { PrismaClient } from '@prisma/client';
import * as path from 'path';
import * as fs from 'fs';

const prisma = new PrismaClient({
  log: [
    { level: 'query', emit: 'event' },
  ],
});

interface QueryMetric {
  name: string;
  duration: number;
  rowCount: number;
}

const metrics: QueryMetric[] = [];

// ─── Helper: Measure Query ───────────────────────────────────────────────────

async function measureQuery<T>(
  name: string,
  queryFn: () => Promise<T>
): Promise<T> {
  const start = performance.now();
  const result = await queryFn();
  const duration = performance.now() - start;

  const rowCount = Array.isArray(result) ? result.length : 1;
  metrics.push({ name, duration, rowCount });

  console.log(`  ├─ ${name}: ${duration.toFixed(2)}ms (${rowCount} rows)`);
  return result;
}

// ─── Main Test Suite ─────────────────────────────────────────────────────────

async function runTests() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  DAFC OTB — Database Query Performance Test');
  console.log('═══════════════════════════════════════════════════════════════\n');

  try {
    // ─── Connection Test ───────────────────────────────────────────
    console.log('▸ Connection Test');
    await measureQuery('Database Connection', async () => {
      return prisma.$queryRaw`SELECT 1`;
    });
    console.log('');

    // ─── Master Data Queries ───────────────────────────────────────
    console.log('▸ Master Data Queries');

    await measureQuery('List All Brands', async () => {
      return prisma.groupBrand.findMany({
        orderBy: { sortOrder: 'asc' },
      });
    });

    await measureQuery('List All Stores', async () => {
      return prisma.store.findMany();
    });

    await measureQuery('List Categories (Hierarchical)', async () => {
      return prisma.category.findMany({
        include: {
          subCategories: true,
        },
      });
    });

    await measureQuery('SKU Catalog (First 100)', async () => {
      return prisma.skuCatalog.findMany({
        take: 100,
        include: {
          brand: true,
          subCategory: true,
        },
      });
    });

    await measureQuery('SKU Search (keyword)', async () => {
      return prisma.skuCatalog.findMany({
        where: {
          OR: [
            { skuCode: { contains: 'dress', mode: 'insensitive' } },
            { name: { contains: 'dress', mode: 'insensitive' } },
          ],
        },
        take: 50,
      });
    });
    console.log('');

    // ─── Budget Queries ────────────────────────────────────────────
    console.log('▸ Budget Queries');

    await measureQuery('List Budgets (Paginated)', async () => {
      return prisma.budget.findMany({
        take: 20,
        orderBy: { createdAt: 'desc' },
        include: {
          brand: true,
          _count: { select: { details: true } },
        },
      });
    });

    await measureQuery('Budget with Full Details', async () => {
      const budget = await prisma.budget.findFirst();
      if (!budget) return null;

      return prisma.budget.findUnique({
        where: { id: budget.id },
        include: {
          brand: true,
          details: {
            include: {
              store: true,
            },
          },
          approvals: true,
        },
      });
    });

    await measureQuery('Budget Statistics (Aggregation)', async () => {
      return prisma.budget.groupBy({
        by: ['status'],
        _count: { id: true },
        _sum: { totalBudget: true },
      });
    });
    console.log('');

    // ─── Planning Queries ──────────────────────────────────────────
    console.log('▸ Planning Queries');

    await measureQuery('List Planning Versions', async () => {
      return prisma.planningVersion.findMany({
        take: 20,
        orderBy: { createdAt: 'desc' },
        include: {
          budget: { include: { brand: true } },
          _count: { select: { details: true } },
        },
      });
    });

    await measureQuery('Planning with Details', async () => {
      const version = await prisma.planningVersion.findFirst();
      if (!version) return null;

      return prisma.planningVersion.findUnique({
        where: { id: version.id },
        include: {
          details: true,
          approvals: true,
        },
      });
    });
    console.log('');

    // ─── Proposal Queries ──────────────────────────────────────────
    console.log('▸ Proposal Queries');

    await measureQuery('List Proposals', async () => {
      return prisma.proposal.findMany({
        take: 20,
        orderBy: { createdAt: 'desc' },
        include: {
          budget: { include: { brand: true } },
          _count: { select: { products: true } },
        },
      });
    });

    await measureQuery('Proposal with Products & Allocations', async () => {
      const proposal = await prisma.proposal.findFirst();
      if (!proposal) return null;

      return prisma.proposal.findUnique({
        where: { id: proposal.id },
        include: {
          products: {
            include: {
              sku: true,
              allocations: { include: { store: true } },
            },
          },
        },
      });
    });
    console.log('');

    // ─── Complex Queries ───────────────────────────────────────────
    console.log('▸ Complex Queries');

    await measureQuery('Dashboard Summary (Multiple Aggregations)', async () => {
      const [budgets, planning, proposals] = await Promise.all([
        prisma.budget.aggregate({
          _count: { id: true },
          _sum: { totalBudget: true, committedBudget: true },
        }),
        prisma.planningVersion.count(),
        prisma.proposal.aggregate({
          _count: { id: true },
          _sum: { totalValue: true },
        }),
      ]);
      return { budgets, planning, proposals };
    });

    await measureQuery('Full Text Search Across Entities', async () => {
      const searchTerm = 'ferragamo';
      const [skus, budgets] = await Promise.all([
        prisma.skuCatalog.findMany({
          where: {
            OR: [
              { name: { contains: searchTerm, mode: 'insensitive' } },
              { skuCode: { contains: searchTerm, mode: 'insensitive' } },
            ],
          },
          take: 10,
        }),
        prisma.budget.findMany({
          where: {
            brand: { name: { contains: searchTerm, mode: 'insensitive' } },
          },
          take: 10,
        }),
      ]);
      return { skus, budgets };
    });
    console.log('');

    // ─── Summary ───────────────────────────────────────────────────
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('  Performance Summary');
    console.log('═══════════════════════════════════════════════════════════════\n');

    const totalQueries = metrics.length;
    const totalDuration = metrics.reduce((sum, m) => sum + m.duration, 0);
    const avgDuration = totalDuration / totalQueries;
    const maxQuery = metrics.reduce((max, m) => m.duration > max.duration ? m : max);
    const minQuery = metrics.reduce((min, m) => m.duration < min.duration ? m : min);

    console.log(`  Total Queries:    ${totalQueries}`);
    console.log(`  Total Duration:   ${totalDuration.toFixed(2)}ms`);
    console.log(`  Avg Duration:     ${avgDuration.toFixed(2)}ms`);
    console.log(`  Fastest Query:    ${minQuery.name} (${minQuery.duration.toFixed(2)}ms)`);
    console.log(`  Slowest Query:    ${maxQuery.name} (${maxQuery.duration.toFixed(2)}ms)`);
    console.log('');

    // Queries over threshold
    const slowQueries = metrics.filter(m => m.duration > 100);
    if (slowQueries.length > 0) {
      console.log('  Slow Queries (>100ms):');
      slowQueries.forEach(q => {
        console.log(`      - ${q.name}: ${q.duration.toFixed(2)}ms`);
      });
    } else {
      console.log('  All queries under 100ms');
    }

    // Save report
    const report = {
      timestamp: new Date().toISOString(),
      totalQueries,
      totalDurationMs: totalDuration,
      avgDurationMs: avgDuration,
      maxQueryMs: maxQuery.duration,
      minQueryMs: minQuery.duration,
      slowQueriesCount: slowQueries.length,
      queries: metrics,
    };

    // Write to reports directory (relative to this script)
    const reportDir = path.resolve(__dirname, '../../performance-testing/reports');
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    const reportPath = path.join(reportDir, 'db_perf_test.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n  Report: ${reportPath}`);

  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run tests
runTests();
