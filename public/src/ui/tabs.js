// ui/tabs.js
export function mountTabs({ onTab }) {
  const navButtons = document.querySelectorAll(".nav-button[data-tab]");
  const tabContents = document.querySelectorAll(".tab-content");

  function switchTab(tabId) {
    navButtons.forEach(btn => btn.classList.remove("active"));
    tabContents.forEach(c => c.classList.remove("active"));
    const activeBtn = document.querySelector(`[data-tab="${tabId}"]`);
    const activeContent = document.getElementById(`${tabId}-tab`);
    if (activeBtn && activeContent) {
      activeBtn.classList.add("active");
      activeContent.classList.add("active");
      onTab?.(tabId);
    }
  }

  navButtons.forEach(btn => btn.addEventListener("click", () => switchTab(btn.dataset.tab)));
  return { switchTab };
}
