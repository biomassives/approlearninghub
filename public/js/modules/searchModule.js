import subcategoryData from './subcategory-fallback.json' assert { type: 'json' };

const apiEndpoint = '/api/search'; // adjust to match your real endpoint

export class SearchModule {
  constructor(searchInputId, resultContainerId, breadcrumbId, statementId) {
    this.searchInput = document.getElementById(searchInputId);
    this.resultContainer = document.getElementById(resultContainerId);
    this.breadcrumb = document.getElementById(breadcrumbId);
    this.statement = document.getElementById(statementId);
    this.data = subcategoryData;
    this.init();
  }

  init() {
    if (!this.searchInput) return;
    this.searchInput.addEventListener('input', () => {
      const term = this.searchInput.value.toLowerCase();
      this.performSearch(term);
    });
  }

  performSearch(query) {
    this.clearResults();

    const matches = [];

    this.data.forEach(area => {
      area.subcategories.forEach(sub => {
        const match =
          sub.title.toLowerCase().includes(query) ||
          sub.description.toLowerCase().includes(query) ||
          sub.tags.some(tag => tag.toLowerCase().includes(query));

        if (match) {
          matches.push({ area: area.area, ...sub });
        }
      });
    });

    if (matches.length > 0) {
      matches.forEach(match => this.renderMatch(match));
    } else {
      this.resultContainer.innerHTML = '<p>No local matches found. Checking remote...</p>';
    }

    this.fetchFromApi(query);
  }

  renderMatch({ area, title, description }) {
    const breadcrumb = document.createElement('div');
    breadcrumb.className = 'text-sm text-gray-600 mb-1';
    breadcrumb.innerText = `${area} → ${title}`;

    const statement = document.createElement('p');
    statement.className = 'text-base text-gray-800 mb-2';
    statement.innerText = description;

    this.resultContainer.appendChild(breadcrumb);
    this.resultContainer.appendChild(statement);
  }

  async fetchFromApi(query) {
    try {
      const response = await fetch(`${apiEndpoint}?q=${encodeURIComponent(query)}`);
      const result = await response.json();

      if (result?.videos?.length) {
        this.resultContainer.insertAdjacentHTML(
          'beforeend',
          `<h3 class="mt-4 font-bold text-lg">Remote Matches:</h3>`
        );
        result.videos.forEach(video => {
          const vid = document.createElement('div');
          vid.className = 'p-2 border rounded shadow-sm mb-2';
          vid.innerHTML = `
            <h4 class="font-semibold">${video.title}</h4>
            <p class="text-sm text-gray-700">${video.description}</p>
          `;
          this.resultContainer.appendChild(vid);
        });
      }
    } catch (err) {
      console.warn('API lookup failed, likely offline or misrouted.', err);
    }
  }

  clearResults() {
    this.resultContainer.innerHTML = '';
  }
}
