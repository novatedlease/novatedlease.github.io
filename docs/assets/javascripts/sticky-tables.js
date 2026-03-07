document$.subscribe(function () {
  var tables = document.querySelectorAll(".compact-table table");

  tables.forEach(function (table) {
    var scrollWrap = table.closest(".md-typeset__scrollwrap");
    if (!scrollWrap) return;

    var thead = table.querySelector("thead");

    // Collect frozen column cells
    var col1Cells = Array.from(table.querySelectorAll("tr th:first-child, tr td:first-child"));
    var col2Cells = Array.from(table.querySelectorAll("tr th:nth-child(2), tr td:nth-child(2)"));

    // Style setup for frozen columns
    col1Cells.concat(col2Cells).forEach(function (cell) {
      cell.style.position = "relative";
      cell.style.backgroundColor = "var(--md-default-bg-color)";
    });
    col1Cells.forEach(function (cell) {
      cell.style.whiteSpace = "nowrap";
      cell.style.zIndex = "2";
    });
    col2Cells.forEach(function (cell) {
      cell.style.zIndex = "2";
    });
    // Corner cells (header + frozen cols) need highest z-index
    table.querySelectorAll("thead th:first-child, thead th:nth-child(2)").forEach(function (cell) {
      cell.style.zIndex = "4";
    });

    // Freeze columns on horizontal scroll via translateX
    function updateFrozenCols() {
      var scrollLeft = scrollWrap.scrollLeft;
      col1Cells.forEach(function (cell) {
        cell.style.transform = "translateX(" + scrollLeft + "px)";
      });
      col2Cells.forEach(function (cell) {
        cell.style.transform = "translateX(" + scrollLeft + "px)";
      });
    }
    scrollWrap.addEventListener("scroll", updateFrozenCols, { passive: true });
    updateFrozenCols();

    // Sticky header row via translateY on vertical page scroll
    if (!thead) return;

    function getHeaderHeight() {
      var header = document.querySelector(".md-header");
      return header ? header.offsetHeight : 0;
    }

    function updateStickyHeader() {
      var wrapRect = scrollWrap.getBoundingClientRect();
      var headerHeight = getHeaderHeight();
      var theadHeight = thead.offsetHeight;
      var offset = headerHeight - wrapRect.top;

      if (offset > 0 && wrapRect.bottom > headerHeight + theadHeight) {
        thead.style.transform = "translateY(" + offset + "px)";
        thead.style.position = "relative";
        thead.style.zIndex = "3";
      } else {
        thead.style.transform = "";
        thead.style.position = "";
        thead.style.zIndex = "";
      }
    }

    window.addEventListener("scroll", updateStickyHeader, { passive: true });
    updateStickyHeader();
  });
});
