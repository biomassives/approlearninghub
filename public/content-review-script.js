        let searchableItems = []; // For search functionality

        // Debounce function
        function debounce(func, delay) {
            let timeout;
            return function(...args) {
                clearTimeout(timeout);
                timeout = setTimeout(() => func.apply(this, args), delay);
            };
        }

        function createAccordionItem(title, contentHtml, parentElement, defaultOpen = false) {
            if (!contentHtml || (Array.isArray(contentHtml) && contentHtml.length === 0) || (typeof contentHtml === 'string' && contentHtml.trim() === '')) {
                return; // Don't create accordion for empty content
            }

            const itemDiv = document.createElement('div');
            itemDiv.className = 'accordion-item';

            const button = document.createElement('button');
            button.className = 'accordion-button';
            button.textContent = title;

            const contentDiv = document.createElement('div');
            contentDiv.className = 'accordion-content';

            if (Array.isArray(contentHtml)) {
                const ul = document.createElement('ul');
                contentHtml.forEach(itemText => {
                    const li = document.createElement('li');
                    li.textContent = itemText;
                    ul.appendChild(li);
                });
                contentDiv.appendChild(ul);
            } else {
                contentDiv.innerHTML = `<p>${contentHtml}</p>`; // Use innerHTML if content might have simple HTML
            }
            
            itemDiv.appendChild(button);
            itemDiv.appendChild(contentDiv);
            parentElement.appendChild(itemDiv);

            if (defaultOpen) {
                button.classList.add('active');
                contentDiv.style.maxHeight = contentDiv.scrollHeight + "px";
                contentDiv.classList.add('open');
            }

            button.addEventListener('click', function() {
                this.classList.toggle('active');
                const content = this.nextElementSibling;
                if (content.style.maxHeight && content.style.maxHeight !== "0px") {
                    content.style.maxHeight = null;
                    content.classList.remove('open');
                } else {
                    content.style.maxHeight = content.scrollHeight + "px";
                    content.classList.add('open');
                }
            });
        }


        async function loadLearningModules() {
            const container = document.getElementById('modulesContainer');
            searchableItems = []; // Reset for potential reloads

            try {
                const response = await fetch('data/learning_modules-catsubcat-tags-featured.json');
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}. Could not load JSON file.`);
                }
                const categoryData = await response.json();

                if (!categoryData || !Array.isArray(categoryData) || categoryData.length === 0) {
                    // Handle no data
                    return;
                }

                categoryData.forEach(area => {
                    const areaSection = document.createElement('section');
                    areaSection.className = 'area-section';
                    // ... (area header rendering - same as before)
                    const areaHeader = document.createElement('h2');
                    areaHeader.className = 'area-header';
                    const areaIcon = document.createElement('i');
                    areaIcon.className = `fas ${area.icon || 'fa-folder'}`;
                    areaHeader.appendChild(areaIcon);
                    areaHeader.appendChild(document.createTextNode(` ${area.area || 'Unnamed Area'}`));
                    areaSection.appendChild(areaHeader);


                    if (area.subcategories && area.subcategories.length > 0) {
                        area.subcategories.forEach((subcategory, subcatIndex) => {
                            const subcategoryId = `subcategory-${subcategory.uniqueId || area.area.replace(/\s+/g, '-') + '-' + subcatIndex}`;
                            const subcategoryCard = document.createElement('div');
                            subcategoryCard.className = 'subcategory-card';
                            subcategoryCard.id = subcategoryId;

                            const subcategoryTitleEl = document.createElement('h3');
                            subcategoryTitleEl.textContent = subcategory.title || 'Untitled Subcategory';
                            subcategoryCard.appendChild(subcategoryTitleEl);

                            // Add subcategory to searchable items
                            searchableItems.push({
                                id: subcategoryId,
                                title: subcategory.title,
                                type: 'module',
                                icon: area.icon || 'fa-cube' // Use area icon for module
                            });
                            
                            // Accordion for details
                            createAccordionItem('Description', subcategory.description, subcategoryCard);
                            createAccordionItem('Context', subcategory.context, subcategoryCard);
                            createAccordionItem('Materials', subcategory.materials, subcategoryCard); // Assuming materials is an array
                            createAccordionItem('Process Steps', subcategory.processSteps, subcategoryCard); // Assuming processSteps is an array
                            

                            if (subcategory.tags && subcategory.tags.length > 0) {
                                // ... (tags rendering - same as before)
                                const tagsContainer = document.createElement('div');
                                tagsContainer.className = 'tags-container';
                                subcategory.tags.forEach(tagText => {
                                    const tagElement = document.createElement('span');
                                    tagElement.className = 'tag';
                                    tagElement.textContent = tagText;
                                    tagsContainer.appendChild(tagElement);
                                });
                                subcategoryCard.appendChild(tagsContainer);
                            }

                            if (subcategory.videos && subcategory.videos.length > 0) {
                                const videosHeader = document.createElement('h4');
                                videosHeader.className = 'videos-section-header';
                                videosHeader.textContent = 'Relevant Videos:';
                                subcategoryCard.appendChild(videosHeader);

                                subcategory.videos.forEach((video, videoIndex) => {
                                    const videoId = `video-${subcategory.uniqueId || subcatIndex}-${videoIndex}`;
                                    const videoEntry = document.createElement('div');
                                    videoEntry.className = 'video-entry';
                                    videoEntry.id = videoId;
                                    
                                    const videoIconColor = video.color_tag || 'var(--primary-color)';
                                    videoEntry.style.borderLeftColor = videoIconColor;

                                    // ... (video icon rendering - same as before)
                                    const videoIconContainer = document.createElement('div');
                                    videoIconContainer.className = 'video-icon';
                                    const iconElement = document.createElement('i');
                                    iconElement.className = video.icon_tag_fa || 'fas fa-play-circle';
                                    iconElement.style.color = videoIconColor;
                                    videoIconContainer.appendChild(iconElement);
                                    videoEntry.appendChild(videoIconContainer);

                                    const videoDetails = document.createElement('div');
                                    videoDetails.className = 'video-details';

                                    const videoLink = document.createElement('a');
                                    videoLink.href = `https://www.youtube.com/watch?v=_odf0yOL6Kk1{video.youtubeId}`;
                                    videoLink.textContent = video.title || 'Untitled Video';
                                    videoLink.target = '_blank';
                                    videoLink.rel = 'noopener noreferrer';
                                    videoDetails.appendChild(videoLink);

                                    if (video.description) {
                                        const videoDesc = document.createElement('p');
                                        videoDesc.textContent = video.description;
                                        videoDetails.appendChild(videoDesc);
                                    }
                                    videoEntry.appendChild(videoDetails);
                                    subcategoryCard.appendChild(videoEntry);

                                    // Add video to searchable items
                                    searchableItems.push({
                                        id: videoId,
                                        title: video.title,
                                        description: video.description,
                                        type: 'video',
                                        icon: video.icon_tag_fa || 'fa-play-circle'
                                    });
                                });
                            }
                            areaSection.appendChild(subcategoryCard);
                        });
                    }
                    container.appendChild(areaSection);
                });

            } catch (error) {
                // ... (error handling - same as before)
                console.error('Error loading or processing learning modules:', error);
                const errorElement = document.createElement('p');
                errorElement.className = 'error-message';
                errorElement.textContent = `Error: ${error.message}. Please check the console for more details.`;
                while (container.children.length > 1) { container.removeChild(container.lastChild); }
                container.appendChild(errorElement);
            }
        }

        function handleSearch() {
            const searchTerm = document.getElementById('searchInput').value.toLowerCase();
            const resultsContainer = document.getElementById('searchResults');
            resultsContainer.innerHTML = '';

            if (searchTerm.length < 2) { // Only search if term is 2+ chars
                return;
            }

            const filteredModules = searchableItems.filter(item =>
                item.type === 'module' && item.title.toLowerCase().includes(searchTerm)
            );

            const filteredVideos = searchableItems.filter(item =>
                item.type === 'video' &&
                (item.title.toLowerCase().includes(searchTerm) || (item.description && item.description.toLowerCase().includes(searchTerm)))
            );

            if (filteredModules.length > 0) {
                const moduleLabel = document.createElement('div');
                moduleLabel.className = 'suggestion-category-label';
                moduleLabel.textContent = 'Learning Modules';
                resultsContainer.appendChild(moduleLabel);

                filteredModules.forEach(item => {
                    const div = document.createElement('div');
                    div.className = 'suggestion-item';
                    div.innerHTML = `<i class="fas ${item.icon} module-icon"></i> <span>${item.title}</span>`;
                    div.onclick = () => {
                        document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        resultsContainer.innerHTML = ''; // Clear results after click
                        document.getElementById('searchInput').value = ''; // Clear search input
                    };
                    resultsContainer.appendChild(div);
                });
            }

            if (filteredVideos.length > 0) {
                 const videoLabel = document.createElement('div');
                videoLabel.className = 'suggestion-category-label';
                videoLabel.textContent = 'Videos';
                resultsContainer.appendChild(videoLabel);

                filteredVideos.forEach(item => {
                    const div = document.createElement('div');
                    div.className = 'suggestion-item';
                    // Highlight search term in title - basic implementation
                    let displayTitle = item.title;
                    const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
                    displayTitle = displayTitle.replace(regex, '<mark>$1</mark>');

                    div.innerHTML = `<i class="fas ${item.icon} video-icon-search"></i> <span title="${item.description || ''}">${displayTitle}</span>`;
                    div.onclick = () => {
                        document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        resultsContainer.innerHTML = '';
                        document.getElementById('searchInput').value = '';
                    };
                    resultsContainer.appendChild(div);
                });
            }
             if (filteredModules.length === 0 && filteredVideos.length === 0) {
                resultsContainer.innerHTML = '<div class="suggestion-item" style="justify-content:center;">No results found.</div>';
            }
        }

        document.addEventListener('DOMContentLoaded', () => {
            loadLearningModules();
            const searchInput = document.getElementById('searchInput');
            // Use debounced version for input event
            searchInput.addEventListener('input', debounce(handleSearch, 300));

            // Clear search results if user clicks outside search area
            document.addEventListener('click', function(event) {
                const searchMenu = document.querySelector('.floating-search-menu');
                const resultsContainer = document.getElementById('searchResults');
                if (!searchMenu.contains(event.target) && resultsContainer.innerHTML !== '') {
                    // resultsContainer.innerHTML = ''; // Optionally clear results
                }
            });
        });
