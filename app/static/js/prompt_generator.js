// app/static/js/prompt_generator.js
document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const navItems = document.querySelectorAll('.nav-item');
    const forms = {
        campaign: document.getElementById('campaignForm'),
        adset: document.getElementById('adsetForm'),
        ad: document.getElementById('adForm')
    };
    const promptOutputCard = document.getElementById('promptOutputCard');
    const generatedPromptDisplay = document.getElementById('generatedPrompt');
    const copyPromptBtn = document.getElementById('copyPromptBtn');

    // Campaign Form Elements
    const campaignNameInput = document.getElementById('campaignName');
    const campaignObjectiveSelect = document.getElementById('campaignObjective');
    const generateCampaignPromptBtn = document.getElementById('generateCampaignPrompt');

    // Ad Set Form Elements
    const adsetNameInput = document.getElementById('adsetName');
    const dailyBudgetInput = document.getElementById('dailyBudget');
    const billingEventSelect = document.getElementById('billingEvent');
    const optimizationGoalSelect = document.getElementById('optimizationGoal');
    const bidStrategySelect = document.getElementById('bidStrategy');
    const adsetStatusSelect = document.getElementById('adsetStatus');
    const countriesInput = document.getElementById('countries');
    const ageMinInput = document.getElementById('ageMin');
    const ageMaxInput = document.getElementById('ageMax');
    const interestsInput = document.getElementById('interests');
    const behaviorsInput = document.getElementById('behaviors');
    const generateAdsetPromptBtn = document.getElementById('generateAdsetPrompt');

    // Ad Form Elements
    const adNameInput = document.getElementById('adName');
    const isCatalogAdCheckbox = document.getElementById('isCatalogAd');
    const templateUrlGroup = document.getElementById('templateUrlGroup');
    const templateUrlInput = document.getElementById('templateUrl');
    const adStatusSelect = document.getElementById('adStatus');
    const generateAdPromptBtn = document.getElementById('generateAdPrompt');

    let currentFormType = 'campaign'; // Default active form

    // --- Authentication Check ---
    const token = localStorage.getItem('access_token');
    // Ensure the authentication check does not redirect if already on login/register/forgot-password pages
    if (!token && window.location.pathname !== '/' && window.location.pathname !== '/register' && window.location.pathname !== '/forgot-password') {
        window.location.href = '/';
        return;
    }

    // --- Helper Functions ---

    function showForm(formType) {
        // Hide all forms
        for (const key in forms) {
            forms[key].classList.add('hidden');
        }
        // Show the selected form
        forms[formType].classList.remove('hidden');
        currentFormType = formType; // Update current active form type
        promptOutputCard.classList.add('hidden'); // Hide prompt output when switching forms
        generatedPromptDisplay.textContent = ''; // Clear prompt
    }

    function setActiveNavItem(selectedNavItem) {
        navItems.forEach(item => item.classList.remove('active'));
        selectedNavItem.classList.add('active');
    }

    function generatePrompt(type) {
        let prompt = '';
        switch (type) {
            case 'campaign':
                const campaignName = campaignNameInput.value.trim();
                const campaignObjective = campaignObjectiveSelect.value;

                if (!campaignName || !campaignObjective) {
                    alert('Please fill in all required fields for Campaign (Name and Objective).');
                    return '';
                }
                prompt = `Create a Facebook campaign with the name '${campaignName}' and objective '${campaignObjective}'.`;
                break;

            case 'adset':
                const adsetName = adsetNameInput.value.trim();
                const dailyBudget = dailyBudgetInput.value.trim();
                const billingEvent = billingEventSelect.value;
                const optimizationGoal = optimizationGoalSelect.value;
                const bidStrategy = bidStrategySelect.value;
                const adsetStatus = adsetStatusSelect.value;
                const countries = countriesInput.value.trim();
                const ageMin = ageMinInput.value.trim();
                const ageMax = ageMaxInput.value.trim();
                const interests = interestsInput.value.trim();
                const behaviors = behaviorsInput.value.trim();

                // Basic validation for required fields
                if (!adsetName || !dailyBudget || !billingEvent || !optimizationGoal || !bidStrategy || !adsetStatus || !countries || !ageMin || !ageMax) {
                    alert('Please fill in all required fields for Ad Set.');
                    return '';
                }
                // Numeric validations
                if (parseInt(dailyBudget) < 1000) {
                     alert('Daily Budget must be at least 1000 cents.');
                     return '';
                }
                const minAge = parseInt(ageMin);
                const maxAge = parseInt(ageMax);
                if (isNaN(minAge) || isNaN(maxAge) || minAge < 13 || minAge > 65 || maxAge < 13 || maxAge > 65 || minAge > maxAge) {
                     alert('Age range must be between 13 and 65, and min age cannot be greater than max age.');
                     return '';
                }

                prompt = `Create an ad set named '${adsetName}' with a daily budget of ${dailyBudget} cents. `;
                prompt += `Billing event: '${billingEvent}', Optimization Goal: '${optimizationGoal}', Bid Strategy: '${bidStrategy}', Status: '${adsetStatus}'. `;
                // Clean and format countries
                const cleanedCountries = countries.split(',').map(c => c.trim().toUpperCase()).filter(c => c !== '').join(',');
                if (cleanedCountries) {
                    prompt += `Target countries: ${cleanedCountries}. `;
                } else {
                    alert('Please provide valid countries (comma-separated).');
                    return '';
                }

                prompt += `Age range: ${minAge}-${maxAge}.`;
                if (interests) {
                    prompt += ` Interests: ${interests}.`; // Bot will search for IDs
                }
                if (behaviors) {
                    prompt += ` Behaviors: ${behaviors}.`; // Bot will search for IDs
                }
                break;

            case 'ad':
                const adName = adNameInput.value.trim();
                const isCatalogAd = isCatalogAdCheckbox.checked;
                const templateUrl = templateUrlInput.value.trim();
                const adStatus = adStatusSelect.value;

                if (!adName || !adStatus) {
                    alert('Please fill in all required fields for Ad (Name and Status).');
                    return '';
                }
                if (isCatalogAd && !templateUrl) {
                    alert('Template URL is required for Catalog Ads.');
                    return '';
                }
                // Basic URL validation
                if (isCatalogAd && templateUrl && !/^https?:\/\/\S+$/.test(templateUrl)) {
                    alert('Please enter a valid URL for Template URL (must start with http:// or https://).');
                    return '';
                }


                prompt = `Create a Facebook ad named '${adName}' with status '${adStatus}'.`;
                if (isCatalogAd) {
                    prompt += ` It is a catalog ad and its template URL is '${templateUrl}'.`;
                }
                break;
        }
        return prompt;
    }

    // --- Event Listeners ---

    // Sidebar navigation
    navItems.forEach(item => {
        item.addEventListener('click', function() {
            const formType = this.dataset.form;
            setActiveNavItem(this);
            showForm(formType);
        });
    });

    // Toggle Template URL input for Ad Form
    isCatalogAdCheckbox.addEventListener('change', function() {
        if (this.checked) {
            templateUrlGroup.style.display = 'block';
            templateUrlInput.setAttribute('required', 'required');
        } else {
            templateUrlGroup.style.display = 'none';
            templateUrlInput.removeAttribute('required');
            templateUrlInput.value = ''; // Clear value when hidden
        }
    });

    // Generate Prompt Buttons
    generateCampaignPromptBtn.addEventListener('click', function() {
        const prompt = generatePrompt('campaign');
        if (prompt) {
            generatedPromptDisplay.textContent = prompt;
            promptOutputCard.classList.remove('hidden');
        }
    });

    generateAdsetPromptBtn.addEventListener('click', function() {
        const prompt = generatePrompt('adset');
        if (prompt) {
            generatedPromptDisplay.textContent = prompt;
            promptOutputCard.classList.remove('hidden');
        }
    });

    generateAdPromptBtn.addEventListener('click', function() {
        const prompt = generatePrompt('ad');
        if (prompt) {
            generatedPromptDisplay.textContent = prompt;
            promptOutputCard.classList.remove('hidden');
        }
    });

    // Copy Prompt Button
    copyPromptBtn.addEventListener('click', function() {
        const promptText = generatedPromptDisplay.textContent;
        if (promptText) {
            // Use Clipboard API for modern browsers
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(promptText).then(() => {
                    alert('Prompt copied to clipboard!');
                }).catch(err => {
                    console.error('Failed to copy prompt (Clipboard API): ', err);
                    // Fallback to execCommand if Clipboard API fails
                    fallbackCopyToClipboard(promptText);
                });
            } else {
                // Fallback for older browsers
                fallbackCopyToClipboard(promptText);
            }
        }
    });

    function fallbackCopyToClipboard(text) {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed'; // Prevent scrolling to bottom
        textarea.style.opacity = '0'; // Hide textarea
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        try {
            document.execCommand('copy');
            alert('Prompt copied to clipboard!');
        } catch (err) {
            console.error('Failed to copy prompt (execCommand): ', err);
            alert('Failed to copy prompt. Please copy manually.');
        } finally {
            document.body.removeChild(textarea);
        }
    }


    // Initial load: show campaign form by default and set active nav item
    showForm(currentFormType);
    setActiveNavItem(document.querySelector('.nav-item[data-form="campaign"]'));
});
