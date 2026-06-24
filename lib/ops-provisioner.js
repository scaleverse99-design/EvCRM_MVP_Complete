import { google } from 'googleapis';
import { OPS_TEMPLATE } from './opsmanager-template';

/**
 * Platform Provisioner v5.0
 * Deploys the "Master Platform Server" on the user's private Google account.
 * This server acts as the central OS for all decentralized apps.
 */
export async function provisionOpsManager(auth) {
  try {
    const script = google.script({ version: 'v1', auth });
    
    // 1. Create a unique security token for this deployment
    const securityToken = Math.random().toString(36).substring(2, 15) + 
                         Math.random().toString(36).substring(2, 15);

    // 2. Create Script Project
    console.log('[Provisioner] Creating Script Project...');
    const project = await script.projects.create({
      requestBody: { title: 'EvCRM_OpsManager_v5' }
    });
    
    const scriptId = project.data.scriptId;

    // 3. Inject Token and Prepare Files
    const finalCode = OPS_TEMPLATE.replace('{{SECURITY_TOKEN}}', securityToken);
    
    await script.projects.updateContent({
      scriptId,
      requestBody: {
        files: [
          {
            name: 'Code',
            type: 'SERVER_JS',
            source: finalCode
          },
          {
            name: 'appsscript',
            type: 'JSON',
            source: JSON.stringify({
              timeZone: 'Asia/Kolkata',
              dependencies: {},
              webapp: {
                access: 'ANYONE', // Protected by internal security token
                executeAs: 'USER_DEPLOYING'
              },
              exceptionLogging: 'STACKDRIVER',
              runtimeVersion: 'V8'
            })
          }
        ]
      }
    });

    // 4. Create Version
    console.log('[Provisioner] Creating Version...');
    const version = await script.projects.versions.create({
      scriptId,
      requestBody: { description: 'v5.0-Initial-Deployment' }
    });

    // 5. Deploy as Web App
    console.log('[Provisioner] Deploying Web App...');
    const deployment = await script.projects.deployments.create({
      scriptId,
      requestBody: {
        versionNumber: version.data.versionNumber,
        description: 'Production-Release'
      }
    });

    const url = deployment.data.entryPoints?.[0]?.webApp?.url;

    return {
      success: true,
      scriptId,
      url,
      token: securityToken,
      message: "OpsManager provisioned successfully."
    };
  } catch (err) {
    console.error('[Provisioner] Error:', err);
    return {
      success: false,
      message: err.message
    };
  }
}
