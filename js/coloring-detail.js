(function () {
  'use strict';

  var PAGE = {
    slug: 'puppy-playing-with-a-ball-in-the-garden',
    title: 'Puppy met een bal in de tuin',
    category: 'dieren',
    difficulty: 'easy',
    image: '/img/kleurplaten/dieren--easy--puppy-playing-with-a-ball-in-the-garden.jpg',
    alt: 'Gratis kleurplaat van een vrolijke puppy die met een bal speelt in een tuin met bloemen'
  };

  function track(eventName, extra) {
    if (typeof window.gtag !== 'function') return;
    window.gtag('event', eventName, Object.assign({
      coloring_slug: PAGE.slug,
      coloring_title: PAGE.title,
      coloring_category: PAGE.category,
      coloring_difficulty: PAGE.difficulty,
      content_language: 'nl',
      interaction_source: 'detail_page'
    }, extra || {}));
  }

  function setStatus(message) {
    var status = document.getElementById('actionStatus');
    if (status) status.textContent = message;
  }

  function absoluteImageUrl() {
    return new URL(PAGE.image, window.location.origin).href;
  }

  function printColoring() {
    var printWindow = window.open('', '_blank', 'width=800,height=900');
    if (!printWindow) {
      setStatus('Sta pop-ups toe om de kleurplaat te kunnen printen.');
      return;
    }

    printWindow.document.write(
      '<!doctype html><html lang="nl"><head><meta charset="UTF-8"/>' +
      '<title>' + PAGE.title + ' – KidsLoveColor</title>' +
      '<style>@page{size:A4 portrait;margin:0}*{box-sizing:border-box;margin:0;padding:0}' +
      'html,body{background:#fff;height:297mm;overflow:hidden;width:210mm}' +
      'img{display:block;height:297mm;object-fit:contain;width:210mm}</style></head>' +
      '<body><img src="' + absoluteImageUrl() + '" alt="' + PAGE.alt + '"/>' +
      '<script>var i=document.querySelector("img");function p(){window.print();window.onafterprint=function(){window.close()}}' +
      'if(i.complete){p()}else{i.onload=p}<\/script></body></html>'
    );
    printWindow.document.close();
    track('coloring_print');
    setStatus('Het afdrukvenster is geopend.');
  }

  function loadJsPdf() {
    if (window.jspdf) return Promise.resolve(window.jspdf);
    return new Promise(function (resolve, reject) {
      var script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
      script.onload = function () { resolve(window.jspdf); };
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  async function downloadPdf() {
    var button = document.getElementById('detailPdf');
    if (button) {
      button.disabled = true;
      button.textContent = 'PDF maken…';
    }
    setStatus('Even wachten, we maken je PDF.');

    try {
      var jspdf = await loadJsPdf();
      var response = await fetch(absoluteImageUrl());
      if (!response.ok) throw new Error('Afbeelding niet beschikbaar');
      var blob = await response.blob();
      var dataUrl = await new Promise(function (resolve, reject) {
        var reader = new FileReader();
        reader.onload = function () { resolve(reader.result); };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      var doc = new jspdf.jsPDF({orientation: 'portrait', unit: 'mm', format: 'a4'});
      doc.addImage(dataUrl, 'JPEG', 0, 0, 210, 297);
      doc.save('puppy-met-bal-kleurplaat-kidslovecolor.pdf');
      track('coloring_download', {download_format: 'pdf'});
      setStatus('Je PDF is gedownload. Veel kleurplezier!');
    } catch (error) {
      console.error('PDF download:', error);
      setStatus('De PDF lukte niet. Gebruik Print kleurplaat en kies “Opslaan als PDF”.');
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = 'Download PDF';
      }
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    var printButton = document.getElementById('detailPrint');
    var downloadLink = document.getElementById('detailDownload');
    var pdfButton = document.getElementById('detailPdf');

    if (printButton) printButton.addEventListener('click', printColoring);
    if (pdfButton) pdfButton.addEventListener('click', downloadPdf);
    if (downloadLink) {
      downloadLink.addEventListener('click', function () {
        track('coloring_download', {download_format: 'jpg'});
        setStatus('Je JPG-download begint. Veel kleurplezier!');
      });
    }

    track('coloring_open');
  });
}());
