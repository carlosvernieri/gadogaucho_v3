import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

let supabaseUrl = 'https://samxgkpylumzyvjmraju.supabase.co';
let supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhbXhna3B5bHVtenl2am1yYWp1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDI2MzAwMSwiZXhwIjoyMDg5ODM5MDAxfQ.kOWH_VERJv2exFB7jih1ED-hFnHddHQDHexGJKUXXhw';

async function fetchSwagger() {
    try {
      const res = await fetch(`${supabaseUrl}/rest/v1/?apikey=${supabaseKey}`);
      const swagger = await res.json();
      
      console.log("=== opportunity_alerts Table Properties ===");
      const props = swagger.definitions.opportunity_alerts?.properties;
      if (props) {
        for (const [propName, propVal] of Object.entries(props)) {
          console.log(` - ${propName}: type=${(propVal as any).type}, format=${(propVal as any).format || 'none'}`);
        }
      } else {
        console.log("opportunity_alerts definition not found in swagger");
      }
    } catch (e) {
      console.error("Error fetching swagger:", e);
    }
}

fetchSwagger();
