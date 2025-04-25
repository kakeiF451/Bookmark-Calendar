let bookmarkData = [];
let currentYear, currentMonth;
let tagFilter = null;

document.getElementById('fileInput').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  const text = await file.text();
  const parser = new DOMParser();
  const doc = parser.parseFromString(text, "text/html");

  const dts = doc.querySelectorAll("dt");
  bookmarkData = Array.from(dts).map(dt => {
    const a = dt.querySelector("a[href][add_date]");
    if (!a) return null;
    const timestamp = parseInt(a.getAttribute("add_date")) * 1000;
    const dd = dt.nextElementSibling;
    const comment = (dd && dd.tagName === 'DD') ? dd.textContent.trim() : "";
    const tags = (a.getAttribute("tags") || "").split(",").map(t => t.trim()).filter(t => t);
    return {
      date: new Date(timestamp),
      url: a.href,
      title: a.textContent,
      comment: comment,
      tags: tags
    };
  }).filter(Boolean);

  populateYearMonthSelect();
  drawCalendar();
});

document.getElementById('downloadBtn').addEventListener('click', () => {
  const rows = [["Date", "Title", "URL", "Comment", "Tags"]];
  const ym = [currentYear, currentMonth];
  bookmarkData.forEach(b => {
    const d = b.date;
    if (d.getFullYear() === ym[0] && d.getMonth() === ym[1]) {
      if (tagFilter && !b.tags.includes(tagFilter)) return;
      rows.push([
        d.toLocaleDateString(), b.title, b.url, b.comment, b.tags.join(",")
      ]);
    }
  });

  const csvContent = rows.map(r => r.map(s => `"${s.replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csvContent], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `bookmarks_${currentYear}_${currentMonth + 1}.csv`;
  a.click();
  URL.revokeObjectURL(url);
});
function populateYearMonthSelect() {
    const years = [...new Set(bookmarkData.map(b => b.date.getFullYear()))].sort();
    const months = [...Array(12).keys()];
    const yearSel = document.getElementById("yearSelect");
    const monthSel = document.getElementById("monthSelect");
  
    yearSel.innerHTML = years.map(y => `<option value="${y}">${y}</option>`).join('');
    monthSel.innerHTML = months.map(m => `<option value="${m}">${m + 1}月</option>`).join('');
  
    const now = new Date();
    currentYear = now.getFullYear();
    currentMonth = now.getMonth();
    yearSel.value = currentYear;
    monthSel.value = currentMonth;
  
    yearSel.addEventListener("change", () => {
      currentYear = parseInt(yearSel.value);
      drawCalendar();
    });
  
    monthSel.addEventListener("change", () => {
      currentMonth = parseInt(monthSel.value);
      drawCalendar();
    });
  
    document.getElementById("searchInput").addEventListener("input", drawCalendar);
    document.getElementById("prevMonth").addEventListener("click", () => {
      if (currentMonth === 0) {
        currentYear -= 1;
        currentMonth = 11;
      } else {
        currentMonth -= 1;
      }
      updateSelectors();
      drawCalendar();
    });
  
    document.getElementById("nextMonth").addEventListener("click", () => {
      if (currentMonth === 11) {
        currentYear += 1;
        currentMonth = 0;
      } else {
        currentMonth += 1;
      }
      updateSelectors();
      drawCalendar();
    });
  }
  
  function updateSelectors() {
    document.getElementById("yearSelect").value = currentYear;
    document.getElementById("monthSelect").value = currentMonth;
  }
  function drawCalendar() {
    const calendar = document.getElementById("calendar");
    const search = document.getElementById("searchInput").value.toLowerCase();
  
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const startDay = firstDay.getDay();
  
    const days = Array(startDay).fill(null)
      .concat([...Array(lastDay.getDate())].map((_, i) => new Date(currentYear, currentMonth, i + 1)));
  
    let totalCount = 0;
    calendar.innerHTML = "";
  
    const dateCounts = {};
    const domainCounts = {};
    const tagCounts = {};
  
    bookmarkData.forEach(b => {
      const y = b.date.getFullYear(), m = b.date.getMonth(), d = b.date.getDate();
      if (y === currentYear && m === currentMonth) {
        if (tagFilter && !b.tags.includes(tagFilter)) return;
        const key = `${y}-${m}-${d}`;
        dateCounts[key] = (dateCounts[key] || 0) + 1;
  
        const domain = new URL(b.url).hostname;
        domainCounts[domain] = (domainCounts[domain] || 0) + 1;
  
        b.tags.forEach(tag => {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        });
      }
    });
  
    const topDates = Object.entries(dateCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(entry => entry[0]);
  
    days.forEach(date => {
      const cell = document.createElement("div");
      if (date) {
        const y = date.getFullYear(), m = date.getMonth(), d = date.getDate();
        const dateKey = `${y}-${m}-${d}`;
        const weekday = date.getDay();
        if (weekday === 0) cell.classList.add("sunday");
        if (weekday === 6) cell.classList.add("saturday");
        cell.classList.add("day");
  
        const bmForDay = bookmarkData.filter(b =>
          b.date.getFullYear() === y &&
          b.date.getMonth() === m &&
          b.date.getDate() === d &&
          (b.title.toLowerCase().includes(search) || b.url.toLowerCase().includes(search)) &&
          (!tagFilter || b.tags.includes(tagFilter))
        );
  
        totalCount += bmForDay.length;
  
        const faviconContainer = document.createElement("div");
        faviconContainer.className = "favicons";
  
        bmForDay.slice(0, 15).forEach(b => {
          const domain = new URL(b.url).hostname;
          const a = document.createElement("a");
          a.href = b.url;
          a.target = "_blank";
          a.rel = "noopener noreferrer";
          a.title = b.comment || b.title;
  
          const img = document.createElement("img");
          img.src = `https://www.google.com/s2/favicons?domain=${domain}`;
          a.appendChild(img);
          faviconContainer.appendChild(a);
        });
  
        const commentBookmark = bmForDay.find(b => b.comment);
        const commentHTML = commentBookmark
          ? `<div class="comment">${commentBookmark.comment.slice(0, 30)}…</div>`
          : "";
  
        let rankClass = "";
        if (topDates[0] === dateKey) rankClass = "rank-1";
        else if (topDates[1] === dateKey) rankClass = "rank-2";
        else if (topDates[2] === dateKey) rankClass = "rank-3";
  
        const hoverText = bmForDay.map(b =>
          (b.comment ? `【${b.title}】 ${b.comment}` : b.title)).join("\n");
  
        cell.setAttribute("title", hoverText);
        cell.innerHTML = `<div class="date">${d}</div><div class="count ${rankClass}">${bmForDay.length}件</div>${commentHTML}`;
        cell.appendChild(faviconContainer);
  
        cell.addEventListener("click", () => {
          const list = bmForDay;
          const detailArea = document.getElementById("detailArea");
          const detailTitle = document.getElementById("detailTitle");
          const detailList = document.getElementById("detailList");
  
          if (list.length === 0) {
            detailArea.style.display = "none";
            return;
          }
  
          detailTitle.textContent = `${y}年${m + 1}月${d}日のブックマーク（${list.length}件）`;
          detailList.innerHTML = "";
  
          list.forEach(b => {
            const li = document.createElement("li");
            const domain = new URL(b.url).hostname;
  
            const a = document.createElement("a");
            a.href = b.url;
            a.textContent = b.title;
            a.target = "_blank";
  
            const icon = document.createElement("img");
            icon.src = `https://www.google.com/s2/favicons?domain=${domain}`;
            icon.className = "favicon";
  
            const comment = document.createElement("div");
            comment.textContent = b.comment ? `💬 ${b.comment}` : "💬 （コメントなし）";
            comment.style.fontSize = "0.9em";
            comment.style.color = "#555";
            comment.style.marginLeft = "1.2em";
  
            const domainInfo = document.createElement("div");
            domainInfo.textContent = `🌐 ${domain}`;
            domainInfo.className = "domain";
  
            const tagContainer = document.createElement("div");
            tagContainer.className = "tags";
            b.tags.forEach(tag => {
              const span = document.createElement("span");
              span.className = "tag";
              span.textContent = `#${tag}`;
              tagContainer.appendChild(span);
            });
  
            li.appendChild(icon);
            li.appendChild(a);
            li.appendChild(domainInfo);
            li.appendChild(comment);
            if (b.tags.length > 0) li.appendChild(tagContainer);
            detailList.appendChild(li);
          });
  
          detailArea.style.display = "block";
          detailArea.scrollIntoView({ behavior: "smooth" });
        });
      } else {
        cell.className = "day";
      }
      calendar.appendChild(cell);
    });
  
    document.getElementById("monthTotal").textContent = totalCount;
  
    const domainList = document.getElementById("domainList");
    const sortedDomains = Object.entries(domainCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
    domainList.innerHTML = sortedDomains.map(([domain, count]) =>
      `<li><img src="https://www.google.com/s2/favicons?domain=${domain}"> ${domain} — ${count}件</li>`
    ).join('');
  
    const tagList = document.getElementById("allTags");
    const sortedTags = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]);
    tagList.innerHTML = "";
    sortedTags.forEach(([tag]) => {
      const span = document.createElement("span");
      span.className = "tag";
      span.textContent = `#${tag}`;
      span.onclick = () => {
        tagFilter = tagFilter === tag ? null : tag;
        drawCalendar();
      };
      if (tagFilter === tag) {
        span.style.background = "#333";
        span.style.color = "white";
      }
      tagList.appendChild(span);
    });
  }
  
  // 年表示ボタンイベントと描画関数
  document.getElementById("toggleViewBtn").addEventListener("click", () => {
    const yearView = document.getElementById("yearView");
    const calendar = document.getElementById("calendar");
    const toggleBtn = document.getElementById("toggleViewBtn");
    if (yearView.style.display === "none") {
      drawYearView();
      yearView.style.display = "block";
      calendar.style.display = "none";
      toggleBtn.textContent = "📆 月表示に切り替え";
    } else {
      yearView.style.display = "none";
      calendar.style.display = "grid";
      toggleBtn.textContent = "📅 年表示に切り替え";
    }
  });
  
  function drawYearView() {
    const yearGrid = document.getElementById("yearGrid");
    yearGrid.innerHTML = "";
    const monthCounts = Array(12).fill(0);
  
    bookmarkData.forEach(b => {
      const y = b.date.getFullYear();
      const m = b.date.getMonth();
      if (y === currentYear) {
        if (!tagFilter || b.tags.includes(tagFilter)) {
          monthCounts[m]++;
        }
      }
    });
  
    for (let i = 0; i < 12; i++) {
      const box = document.createElement("div");
      box.className = "month-box";
      box.innerHTML = `
        <div class="month-name">${i + 1}月</div>
        <div class="month-count">${monthCounts[i]} 件</div>
      `;
      box.addEventListener("click", () => {
        currentMonth = i;
        updateSelectors();
        drawCalendar();
        document.getElementById("yearView").style.display = "none";
        document.getElementById("calendar").style.display = "grid";
        document.getElementById("toggleViewBtn").textContent = "📅 年表示に切り替え";
      });
      yearGrid.appendChild(box);
    }
  }
    