window.CommCoach = window.CommCoach || {};

CommCoach.JargonDict = {
    pageSize: 10,
    currentIndex: 10,
    filteredList: [],
    isLoading: false,

    init() {
        const backBtn = document.getElementById('btn-jargon-back');
        const searchInput = document.getElementById('input-jargon-search');
        const scrollContainer = document.getElementById('jargon-terms-list');

        if (backBtn) {
            backBtn.addEventListener('click', () => {
                if (window.CommCoach && window.CommCoach.Navigation) {
                    window.CommCoach.Navigation.goBack();
                }
            });
        }

        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.renderTerms(e.target.value);
            });
        }

        // Issue 10: Lazy load on scroll to eliminate initial load lag
        if (scrollContainer) {
            scrollContainer.addEventListener('scroll', () => {
                if (scrollContainer.scrollTop + scrollContainer.clientHeight >= scrollContainer.scrollHeight - 100) {
                    this.loadMore();
                }
            });
        }

        this.renderTerms('');
    },

    loadMore() {
        if (this.isLoading || this.currentIndex >= this.filteredList.length) return;
        this.isLoading = true;

        const nextBatch = this.filteredList.slice(this.currentIndex, this.currentIndex + this.pageSize);
        this.currentIndex += this.pageSize;
        
        const container = document.getElementById('jargon-terms-list');
        if (container) {
            nextBatch.forEach(item => {
                const card = this.createCardElement(item);
                container.appendChild(card);
            });
        }
        this.isLoading = false;
    },

    renderTerms(query) {
        const container = document.getElementById('jargon-terms-list');
        if (!container) return;

        const q = (query || '').toLowerCase().trim();
        this.filteredList = this.jargonList.filter(item => {
            return item.term.toLowerCase().includes(q) ||
                   item.definition.toLowerCase().includes(q) ||
                   item.alternative.toLowerCase().includes(q);
        });

        container.innerHTML = '';
        this.currentIndex = 10;

        const initialBatch = this.filteredList.slice(0, this.currentIndex);
        if (initialBatch.length === 0) {
            container.innerHTML = `<div class="pad-24 text-center text-muted font-13">No matching corporate jargon terms found.</div>`;
            return;
        }

        initialBatch.forEach(item => {
            const card = this.createCardElement(item);
            container.appendChild(card);
        });
    },

    createCardElement(item) {
        const card = document.createElement('div');
        card.className = 'analysis-card pad-16';
        card.style.marginBottom = '12px';
        card.style.background = 'var(--bg-surface-elevated)';
        card.style.border = '1px solid var(--border-color)';
        card.style.borderRadius = 'var(--radius-md)';

        card.innerHTML = `
            <div class="flex-row justify-between items-center" style="cursor: pointer;">
                <div>
                    <h4 class="card-heading font-15 font-700" style="color: var(--primary);">${item.term}</h4>
                    <p class="font-12 text-muted" style="margin-top: 2px;">Alternative: <strong class="text-main">${item.alternative}</strong></p>
                </div>
                <button class="btn btn-sm btn-ghost toggle-btn" style="padding: 4px 8px;">
                    <span class="font-12">Expand</span>
                </button>
            </div>

            <div class="details-section pad-top-12" style="display: none; border-top: 1px solid var(--border-color); margin-top: 12px;">
                <div class="pad-vertical-4">
                    <span class="font-11 text-muted" style="text-transform: uppercase;">Definition</span>
                    <p class="font-13 text-main" style="margin-top: 2px;">${item.definition}</p>
                </div>
                <div class="pad-vertical-4">
                    <span class="font-11 text-muted" style="text-transform: uppercase;">Common Usage</span>
                    <p class="font-13 text-main" style="margin-top: 2px;">${item.usage}</p>
                </div>
                <div class="pad-vertical-4">
                    <span class="font-11 text-muted" style="text-transform: uppercase;">Workplace Scenario</span>
                    <p class="font-13 text-main" style="margin-top: 2px;">${item.scenario}</p>
                </div>
                <div class="pad-vertical-4">
                    <span class="font-11 text-muted" style="text-transform: uppercase;">Sample Sentence</span>
                    <p class="font-13 text-main" style="margin-top: 2px; font-style: italic;">"${item.example}"</p>
                </div>
                <div class="pad-vertical-4">
                    <span class="font-11 text-muted" style="text-transform: uppercase;">Overuse Impact</span>
                    <p class="font-13 text-main" style="margin-top: 2px;">${item.impact}</p>
                </div>
                <div class="pad-vertical-4">
                    <span class="font-11 text-muted" style="text-transform: uppercase;">General vs Professional Perception</span>
                    <p class="font-13 text-main" style="margin-top: 2px;">${item.generalVsPro}</p>
                </div>
                <div class="pad-vertical-4">
                    <span class="font-11 text-muted" style="text-transform: uppercase;">When & How To Use</span>
                    <p class="font-13 text-main" style="margin-top: 2px;">${item.whenToUse} — ${item.howToUse}</p>
                </div>
            </div>
        `;

        const header = card.querySelector('.flex-row');
        const details = card.querySelector('.details-section');
        const toggleBtn = card.querySelector('.toggle-btn span');

        header.addEventListener('click', () => {
            const isHidden = details.style.display === 'none';
            details.style.display = isHidden ? 'block' : 'none';
            toggleBtn.innerText = isHidden ? 'Collapse' : 'Expand';
        });

        return card;
    },

    jargonList: [
        {
            term: "Synergy",
            definition: "The combined value and performance of two companies or groups will be greater than the sum of the separate individual parts.",
            usage: "Used when discussing mergers, team collaborations, or cross-departmental projects to highlight the benefit of working together.",
            scenario: "A post-merger all-hands meeting explaining why two departments are being combined.",
            example: "We need to find the synergy between the sales and marketing teams to boost our Q3 metrics.",
            impact: "Can sound vague and buzzwordy, often making the speaker seem insincere or lacking concrete plans.",
            generalVsPro: "General: working together nicely. Professional: a quantifiable financial benefit of collaboration.",
            whenToUse: "When there is a mathematically or logically demonstrable benefit to combination.",
            howToUse: "Back it up with specific examples of what the 'synergy' actually produces.",
            alternative: "Collaboration or Mutual Benefit"
        },
        {
            term: "Circle Back",
            definition: "To return to a topic or discussion at a later time.",
            usage: "Used when a decision cannot be made immediately or when a conversation goes off-topic.",
            scenario: "During a meeting when a participant asks a question that requires further research.",
            example: "I don't have those numbers in front of me, let's circle back on this next week.",
            impact: "Often perceived as a polite way of ignoring the issue or delaying a decision indefinitely.",
            generalVsPro: "General: returning to a physical place. Professional: delaying a discussion.",
            whenToUse: "When you genuinely intend to revisit the topic after gathering more information.",
            howToUse: "Always specify exactly *when* you will return to the topic.",
            alternative: "Discuss Later or Follow Up"
        },
        {
            term: "Bandwidth",
            definition: "The capacity, time, or energy someone has to take on additional tasks.",
            usage: "Used to describe human capacity rather than network data transfer capabilities.",
            scenario: "When a manager tries to assign a new project to an already busy team member.",
            example: "I'd love to help with the new marketing campaign, but I just don't have the bandwidth right now.",
            impact: "Can sound robotic and dehumanizing, treating people like machines with limited processing power.",
            generalVsPro: "General: internet speed. Professional: human time and energy.",
            whenToUse: "When discussing team capacity in resource planning meetings.",
            howToUse: "Use it to quantify task loads rather than personal emotional capacity.",
            alternative: "Capacity or Time"
        },
        {
            term: "Low-Hanging Fruit",
            definition: "Tasks or opportunities that are easy to achieve or complete with minimal effort.",
            usage: "Used to identify quick wins that can deliver immediate results.",
            scenario: "A strategic planning session identifying easy targets for revenue generation.",
            example: "Let's focus on the low-hanging fruit first to show quick progress to the stakeholders.",
            impact: "Can diminish the effort required for simple tasks or distract from high-impact, complex goals.",
            generalVsPro: "General: fruit on lower branches. Professional: easily achievable objectives.",
            whenToUse: "When prioritizing early project milestones for quick momentum.",
            howToUse: "Pair low-hanging fruit with long-term strategic initiatives.",
            alternative: "Quick Wins or Easy Tasks"
        },
        {
            term: "Move the Needle",
            definition: "To make a noticeable or significant difference or impact on a situation or metric.",
            usage: "Used to assess whether an activity will produce meaningful results.",
            scenario: "Evaluating a proposed marketing campaign against quarterly KPIs.",
            example: "Social media posts are nice, but will they actually move the needle on sales?",
            impact: "Overuse makes team members feel that incremental improvements are valueless.",
            generalVsPro: "General: moving a physical gauge. Professional: making a measurable impact.",
            whenToUse: "When evaluating high-stakes strategic choices.",
            howToUse: "Define the specific metric and threshold required to count as 'moving the needle'.",
            alternative: "Make a Significant Impact"
        },
        {
            term: "Boil the Ocean",
            definition: "To undertake an impossible or overly ambitious task or project.",
            usage: "Used to warn against over-scoping a project or attempting too much at once.",
            scenario: "A project manager reviewing a scope document that tries to solve every known company problem.",
            example: "We just need a simple MVP for launch—let me remind everyone not to boil the ocean.",
            impact: "Can discourage ambitious thinking if used to dismiss creative ideas too quickly.",
            generalVsPro: "General: heating the ocean water. Professional: over-complicating a project scope.",
            whenToUse: "When keeping a team focused on realistic core deliverables.",
            howToUse: "Offer a phased approach instead of just shutting down big ideas.",
            alternative: "Over-complicate or Scope Creep"
        },
        {
            term: "Touch Base",
            definition: "To briefly make contact or communicate with someone.",
            usage: "Used to request a quick update or check-in with a colleague or client.",
            scenario: "Sending an email to a client after sending a project proposal.",
            example: "I wanted to touch base regarding the feedback on the design mockups.",
            impact: "Can sound informal or pushy if overused in formal communications.",
            generalVsPro: "General: baseball rule. Professional: short check-in communication.",
            whenToUse: "For informal status checks between close team members.",
            howToUse: "Follow up with a clear purpose or question.",
            alternative: "Check In or Connect"
        },
        {
            term: "Deep Dive",
            definition: "An extensive, detailed analysis or investigation of a topic or issue.",
            usage: "Used when moving from high-level summaries to thorough technical or data analysis.",
            scenario: "An analytics meeting investigating why user drop-off spiked in Q2.",
            example: "We need to do a deep dive into the churn metrics before proposing solutions.",
            impact: "Often used for routine checks, diluting the expectation of thorough research.",
            generalVsPro: "General: underwater diving. Professional: comprehensive investigation.",
            whenToUse: "When preparing dedicated root-cause analysis or auditing sessions.",
            howToUse: "Specify the exact datasets or topics to be thoroughly analyzed.",
            alternative: "Detailed Analysis or In-Depth Review"
        },
        {
            term: "Leverage",
            definition: "To use something to maximum advantage.",
            usage: "Used to describe utilizing assets, data, or partnerships for business gain.",
            scenario: "Explaining how an existing customer base can be used to launch a new product line.",
            example: "We can leverage our existing distribution network to launch this new line quickly.",
            impact: "Overuse makes standard resource utilization sound overly corporate and transactional.",
            generalVsPro: "General: physical lever mechanism. Professional: strategic use of resources.",
            whenToUse: "When presenting clear asset utilization in business cases.",
            howToUse: "State clearly *what* asset is being used and *what* benefit it produces.",
            alternative: "Utilize or Take Advantage Of"
        },
        {
            term: "Pivot",
            definition: "To change strategic direction rapidly in response to market conditions or feedback.",
            usage: "Used when shifting business strategy, product focus, or team direction.",
            scenario: "A startup changing its target market after initial product testing fails.",
            example: "After the initial user testing failed, the leadership team decided to pivot to B2B.",
            impact: "Frequent pivoting creates instability and team burnout.",
            generalVsPro: "General: turning on an axis. Professional: fundamental business strategy shift.",
            whenToUse: "When communicating a significant, planned change in strategic direction.",
            howToUse: "Explain the data that forced the pivot and the new direction clearly.",
            alternative: "Shift Strategy or Change Direction"
        }
    ]
};
