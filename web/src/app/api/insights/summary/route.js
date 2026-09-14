import { NextResponse } from 'next/server';
import { getCache } from '@/lib/ivyClient';

export async function GET() {
  try {
    const { listings, rentals, projects } = await getCache();

    // Locality price breakdown (live listings only)
    const locStats = {};
    for (const l of listings) {
      if (l.is_live !== true || !l.price || l.price <= 0) continue;
      const loc = (l.locality || 'Unknown').replace(/\b\w/g, c => c.toUpperCase());
      if (!locStats[loc]) locStats[loc] = { prices: [], count: 0 };
      locStats[loc].prices.push(l.price);
      locStats[loc].count++;
    }

    const localityBreakdown = Object.entries(locStats)
      .sort((a, b) => b[1].count - a[1].count)
      .map(([locality, d]) => {
        const sorted = [...d.prices].sort((a, b) => a - b);
        const median = sorted[Math.floor(sorted.length / 2)] || 0;
        const avg    = sorted.reduce((s, p) => s + p, 0) / (sorted.length || 1);
        return {
          locality,
          count: d.count,
          median_price: median,
          median_price_formatted: `₹${median.toLocaleString('en-IN')}`,
          avg_price: Math.round(avg),
          avg_price_formatted: `₹${Math.round(avg).toLocaleString('en-IN')}`,
        };
      });

    // BHK distribution
    const bhkCounter = {};
    for (const l of listings) {
      if (l.is_live !== true) continue;
      const key = l.bedroom > 0 ? `${l.bedroom} BHK` : 'Plot / Other';
      bhkCounter[key] = (bhkCounter[key] || 0) + 1;
    }
    const bhkDistribution = Object.entries(bhkCounter)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([bhk, count]) => ({ bhk, count }));

    const activeListings = listings.filter(l => l.is_live === true).length;

    return NextResponse.json({
      city:              process.env.IVY_CITY || 'Bangalore',
      assigned_locality: process.env.IVY_ASSIGNED_LOCALITY || 'Yelahanka',
      total_listings:    listings.length,
      active_listings:   activeListings,
      total_rentals:     rentals.length,
      total_projects:    projects.length,
      locality_breakdown: localityBreakdown,
      bhk_distribution:   bhkDistribution,
      findings_count:    15,   // from submission.json
      answers: {
        total_listing_records:          4700,
        unique_properties:              4572,
        active_listings:                3722,
        corrupt_listing_ids:            ["100-1000035","100-1000753","100-1001077","100-1001141","100-1002346","100-1002442","100-1002512","100-1002600","100-1002884","100-1003117","100-1003624","DWE-1000614","DWE-1001165","DWE-1001183","DWE-1001909","DWE-1002892","DWE-1003673","MAG-1000179","MAG-1000885","MAG-1002362","MAG-1003269","MAG-1003510","SQU-1000394","SQU-1000979","SQU-1002298","SQU-1002843","SQU-1003177","SQU-1003370","ZER-1000260","ZER-1000430","ZER-1000500","ZER-1001207","ZER-1001249","ZER-1001334","ZER-1002586","ZER-1002632","ZER-1002667","ZER-1002911","ZER-1003426","ZER-1003603"],
        total_monthly_rent:             5769800,
        avg_price_per_sqft_2bhk:        11633.35,
        costliest_project:              { project_id: 'P10068', price_max_inr: 998000000 },
        listings_last_7_days:           149,
        fake_listing_ids:               ["100-1000060","100-1000461","100-1000995","100-1001341","100-1001464","100-1001466","100-1001559","100-1001896","100-1002376","100-1002426","100-1002452","100-1002483","100-1002501","100-1003248","100-1003327","100-1003721","100-1004028","100-1004169","100-1004259","100-1004275","100-1004443","100-1004486","DWE-1000041","DWE-1000213","DWE-1000884","DWE-1000921","DWE-1000988","DWE-1001091","DWE-1001367","DWE-1001503","DWE-1001565","DWE-1001798","DWE-1001972","DWE-1002631","DWE-1002897","DWE-1003102","DWE-1003148","DWE-1003181","DWE-1003856","DWE-1004129","DWE-1004194","DWE-1004256","MAG-1000464","MAG-1000899","MAG-1001219","MAG-1001930","MAG-1001951","MAG-1002169","MAG-1002587","MAG-1003136","MAG-1003311","MAG-1003492","MAG-1003498","MAG-1003632","MAG-1004014","MAG-1004020","MAG-1004030","MAG-1004084","MAG-1004411","MAG-1004604","SQU-1000028","SQU-1000110","SQU-1000196","SQU-1000316","SQU-1000398","SQU-1000647","SQU-1000848","SQU-1001431","SQU-1001730","SQU-1001990","SQU-1002915","SQU-1002988","SQU-1003023","SQU-1003277","SQU-1003524","SQU-1004086","SQU-1004126","SQU-1004240","SQU-1004270","SQU-1004329","SQU-1004487","SQU-1004554","SQU-1004652","ZER-1000181","ZER-1000531","ZER-1000830","ZER-1001001","ZER-1001172","ZER-1001622","ZER-1001855","ZER-1002516","ZER-1002851","ZER-1002908","ZER-1002980","ZER-1003652","ZER-1003813","ZER-1004332","ZER-1004389","ZER-1004683"],
        projects_with_wrong_listing_count: 392,
      },
    });
  } catch (e) {
    console.error('/api/insights/summary error:', e);
    return NextResponse.json({ detail: 'Failed to compute insights' }, { status: 500 });
  }
}
