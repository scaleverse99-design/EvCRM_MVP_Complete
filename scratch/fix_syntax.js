const fs = require('fs');
const path = 'c:/Users/balaj/Downloads/EvCRM_MVP_Complete/evcrm-mvp/app/admin/page.js';
let content = fs.readFileSync(path, 'utf8');

// The problematic section is after </aside>
const asideClose = '</aside>';
const splitIndex = content.lastIndexOf(asideClose) + asideClose.length;

if (splitIndex > asideClose.length) {
    const head = content.substring(0, splitIndex);
    const tail = `
       </div>
      </div>
    </div>
  )
}

export default dynamic(() => Promise.resolve(AdminDashboard), { ssr: false })
`;
    fs.writeFileSync(path, head + tail);
    console.log('Successfully patched admin/page.js');
} else {
    console.error('Could not find </aside> tag');
}
