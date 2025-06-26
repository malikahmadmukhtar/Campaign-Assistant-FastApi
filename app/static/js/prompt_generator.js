document.addEventListener('DOMContentLoaded', () => {
    const navItems = document.querySelectorAll('.nav-item[data-form]');
    const forms = {
        campaign: document.getElementById('campaignForm'),
        adset: document.getElementById('adsetForm'),
        ad: document.getElementById('adForm')
    };
    const promptOutputCard = document.getElementById('promptOutputCard');
    const generatedPrompt = document.getElementById('generatedPrompt');
    const copyPromptBtn = document.getElementById('copyPromptBtn');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');

            Object.values(forms).forEach(form => form.classList.add('hidden'));
            const formToShow = item.dataset.form;
            forms[formToShow].classList.remove('hidden');

            promptOutputCard.classList.add('hidden');
            generatedPrompt.textContent = '';
        });
    });

    document.getElementById('generateCampaignPrompt').addEventListener('click', () => {
        const campaignName = document.getElementById('campaignName').value;
        const campaignObjective = document.getElementById('campaignObjective').value;

        if (!campaignName || !campaignObjective) {
            alert('Please fill in all campaign fields.');
            return;
        }

        const prompt = `Create a new Facebook Ad Campaign with the following details:
Campaign Name: ${campaignName}
Objective: ${campaignObjective}`;
        generatedPrompt.textContent = prompt;
        promptOutputCard.classList.remove('hidden');
    });

    document.getElementById('generateAdsetPrompt').addEventListener('click', () => {
        const adsetName = document.getElementById('adsetName').value;
        const dailyBudget = document.getElementById('dailyBudget').value;
        const billingEvent = document.getElementById('billingEvent').value;
        const optimizationGoal = document.getElementById('optimizationGoal').value;
        const bidStrategy = document.getElementById('bidStrategy').value;
        const adsetStatus = document.getElementById('adsetStatus').value;
        const countries = document.getElementById('countries').value;
        const ageMin = document.getElementById('ageMin').value;
        const ageMax = document.getElementById('ageMax').value;
        const interests = document.getElementById('interests').value;
        const behaviors = document.getElementById('behaviors').value;

        if (!adsetName || !dailyBudget || !billingEvent || !optimizationGoal || !bidStrategy || !adsetStatus || !countries || !ageMin || !ageMax) {
            alert('Please fill in all required ad set fields.');
            return;
        }

        let prompt = `Create a new Facebook Ad Set with the following details:
Ad Set Name: ${adsetName}
Daily Budget (in cents): ${dailyBudget}
Billing Event: ${billingEvent}
Optimization Goal: ${optimizationGoal}
Bid Strategy: ${bidStrategy}
Status: ${adsetStatus}
Targeting:
  Countries: ${countries}
  Age Range: ${ageMin}-${ageMax}`;

        if (interests) {
            prompt += `\n  Interests (keywords): ${interests}`;
        }
        if (behaviors) {
            prompt += `\n  Behaviors (keywords): ${behaviors}`;
        }

        generatedPrompt.textContent = prompt;
        promptOutputCard.classList.remove('hidden');
    });

    const isCatalogAdCheckbox = document.getElementById('isCatalogAd');
    const templateUrlGroup = document.getElementById('templateUrlGroup');

    isCatalogAdCheckbox.addEventListener('change', () => {
        if (isCatalogAdCheckbox.checked) {
            templateUrlGroup.style.display = 'block';
        } else {
            templateUrlGroup.style.display = 'none';
        }
    });

    document.getElementById('generateAdPrompt').addEventListener('click', () => {
        const adName = document.getElementById('adName').value;
        const adStatus = document.getElementById('adStatus').value;
        const isCatalogAd = document.getElementById('isCatalogAd').checked;
        const templateUrl = document.getElementById('templateUrl').value;

        if (!adName || !adStatus) {
            alert('Please fill in all required ad fields.');
            return;
        }

        let prompt = `Create a new Facebook Ad with the following details:
Ad Name: ${adName}
Status: ${adStatus}`;

        if (isCatalogAd) {
            if (!templateUrl) {
                alert('Please provide a Template URL for Catalog Ads.');
                return;
            }
            prompt += `\nIs Catalog Ad: Yes
Template URL: ${templateUrl}`;
        } else {
            prompt += `\nIs Catalog Ad: No`;
        }

        generatedPrompt.textContent = prompt;
        promptOutputCard.classList.remove('hidden');
    });

    copyPromptBtn.addEventListener('click', () => {
        const textToCopy = generatedPrompt.textContent;
        navigator.clipboard.writeText(textToCopy).then(() => {
            alert('Prompt copied to clipboard!');
        }).catch(err => {
            console.error('Failed to copy: ', err);
        });
    });
});