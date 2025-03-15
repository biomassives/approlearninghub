let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    // Show install button or prompt here if desired
});

// Safe installation checks
function checkInstallationSupport() {
    // Check if running in standalone mode
    if (window.matchMedia('(display-mode: standalone)').matches) {
        console.log('App is already installed');
        return false;
    }
    
    // Check if installation is supported
    if (deferredPrompt) {
        return true;
    }
    
    return false;
}

// Safe installation prompt
async function showInstallPrompt() {
    if (!checkInstallationSupport()) {
        console.log('Installation not supported or already installed');
        return;
    }

    try {
        const result = await deferredPrompt.prompt();
        console.log(`Install prompt response: ${result.outcome}`);
        deferredPrompt = null;
    } catch (err) {
        console.error('Error showing install prompt:', err);
    }
}