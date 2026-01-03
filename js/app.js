"use strict";

function dbg(v) {
  console.log(typeof v + ": " + v);
}

var transpose = 0;

function setTranspose() {
  if (
    typeof window.location.hash != "undefined" ||
    window.location.hash != ""
  ) {
    transpose = window.location.hash.substr(1).match(/^-?\d*\.?\d+$/) | 0;
  } else {
    transpose = 0;
  }
}
setTranspose();

function changeTranspose(val) {
  if (
    typeof window.location.hash != "undefined" ||
    window.location.hash != ""
  ) {
    transpose = window.location.hash.substr(1).match(/^-?\d*\.?\d+$/) | 0;
  }

  if (val == 1) {
    transpose++;
    window.location.hash = transpose;
  } else {
    transpose--;
    window.location.hash = transpose;
  }
}

function togglePathfinder() {
  pathfinderMode = !pathfinderMode;
  document.getElementById("pathfinderStatus").innerHTML = pathfinderMode ? "On" : "Off";
  // Clear any existing highlights
  document.querySelectorAll('.chord-button').forEach(btn => {
    btn.classList.remove('highlighted', 'selected');
  });
}

var prevChord;
var inversionPattern = 0;
var volume = -12;
var pathfinderMode = true;
var synth = new Tone.PolySynth(4, Tone.Synth).toMaster();
var currentPitchs = null;
var releaseTimeout = null;

// Help
var shown = false;
function shelp() {
  var e = document.getElementById("info");
  if (!shown) {
    e.style.display = "block";
    shown = true;
  } else {
    e.style.display = "none";
    shown = false;
  }
}

document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('#keys button').forEach(btn => btn.classList.add('chord-button'));

    window.allChords = [];
    document.querySelectorAll('.chord-button').forEach(btn => {
      let onmousedown = btn.getAttribute('onmousedown');
      let match = onmousedown.match(/p\(this, event, (\d+), (\[.*?\])\)/);
      if (match) {
        let root = parseInt(match[1]);
        let intervals = JSON.parse(match[2]);
        window.allChords.push({element: btn, root: root, intervals: intervals});
      }
    });
});

function getChordNotes(root, intervals) {
  let notes = [];
  for (let interval of intervals) {
    let midi = root + interval;
    notes.push(midi % 12);
  }
  return notes;
}

function getScaleNotes(root) {
  let scale = [0,2,4,5,7,9,11]; // major scale
  return scale.map(s => (root + s) % 12);
}

function getModifiedIntervals(array, inversionPattern) {
  let modified = [];
  for (let i = 0; i < array.length; i++) {
    let interval = parseInt(array[i], 10);
    if (inversionPattern == 1) {
      if (i == 1) {
        interval = interval - 12;
      }
    }
    if (inversionPattern == 4) {
      if (i == 1) {
        interval = interval + 12;
      }
    }
    if (inversionPattern == 3) {
      if (i == 2) {
        interval = interval - 12;
      }
    }
    if (inversionPattern == 2) {
      if (i == 1) {
        interval = interval - 12;
      }
      if (i == 2) {
        interval = interval - 12;
      }
    }
    modified.push(interval);
  }
  return modified;
}

function intersection(a, b) {
  return a.filter(x => b.indexOf(x) !== -1);
}

function highlightRelated(selectedEl, root, intervals) {
  document.querySelectorAll('.chord-button').forEach(btn => {
    btn.classList.remove('selected', 'key-status-green', 'key-status-yellow', 'key-status-orange', 'key-status-red', 'border-thin-blue', 'border-regular-blue', 'border-thick-blue');
  });
  selectedEl.classList.add('selected');
  let selectedNotes = getChordNotes(root, intervals);
  let scaleNotes = getScaleNotes(root);

  if (!window.allChords) return;

  window.allChords.forEach(chord => {
    if (chord.element === selectedEl) return;
    let modIntervals = getModifiedIntervals(chord.intervals, inversionPattern);
    let chordNotes = getChordNotes(chord.root, modIntervals);
    let sharedWithChord = intersection(selectedNotes, chordNotes).length;
    let sharedWithScale = intersection(scaleNotes, chordNotes).length;
    if ((sharedWithChord === 1 || sharedWithChord === 2) && sharedWithScale === 2) {
      // Apply color status
      let inSameKey = chordNotes.every(note => scaleNotes.includes(note));
      let notesOutside = chordNotes.filter(note => !scaleNotes.includes(note)).length;
      if (inSameKey) {
        chord.element.classList.add('key-status-green');
      } else {
        if (notesOutside === 1) chord.element.classList.add('key-status-yellow');
        else if (notesOutside === 2) chord.element.classList.add('key-status-orange');
        else if (notesOutside >= 3) chord.element.classList.add('key-status-red');

        // Border for shared notes
        if (sharedWithChord === 1) chord.element.classList.add('border-thin-blue');
        else if (sharedWithChord === 2) chord.element.classList.add('border-regular-blue');
        else if (sharedWithChord >= 3) chord.element.classList.add('border-thick-blue');
      }
    }
  });
}

function p(el, ev, root, array) {
  console.log("p called for root", root);
  // mark 1-0
  var ctrl = ev.ctrlKey;

  if (ctrl) {
    if (!el.hasAttribute("ch")) {
      el.style.border = "2px solid yellow";
      el.setAttribute("ch", true);
    } else {
      el.removeAttribute("ch");
      el.style.border = "";
    }
    return;
  }

  // inversion
  var shift = ev.shiftKey;
  if (shift) {
    inversionPattern++;
    if (inversionPattern > 4) inversionPattern = 0;
    document.getElementById("inversion").innerHTML = inversionPattern;
  }
  dbg(inversionPattern);

  // Start audio context if needed
  // Tone.start() is called before playing

  if (pathfinderMode) {
    let modIntervals = getModifiedIntervals(array, inversionPattern);
    highlightRelated(el, root, modIntervals);
  }

  // Handle number key classes
  // Note: keys object is updated by keydown/keyup listeners below
  if (keys[49]) { toggleClass(el, "n1"); return; }
  else if (keys[50]) { toggleClass(el, "n2"); return; }
  else if (keys[51]) { toggleClass(el, "n3"); return; }
  else if (keys[52]) { toggleClass(el, "n4"); return; }
  else if (keys[53]) { toggleClass(el, "n5"); return; }
  else if (keys[54]) { toggleClass(el, "n6"); return; }
  else if (keys[55]) { toggleClass(el, "n7"); return; }
  else if (keys[56]) { toggleClass(el, "n8"); return; }
  else if (keys[57]) { toggleClass(el, "n9"); return; }
  else if (keys[48]) { toggleClass(el, "n0"); return; }

  // chords logging
  var inpt = document.getElementById("chords");
  if (inpt.offsetWidth >= window.innerWidth - 150) inpt.innerHTML = "";
  if (prevChord !== el.innerHTML) {
    inpt.innerHTML = inpt.innerHTML + el.innerHTML + ", ";
  }
  prevChord = el.innerHTML;

  // Play chord
  var pitchs = [];
  root = parseInt(root, 10) + transpose;
  var interval = 0;

  let modIntervals = getModifiedIntervals(array, inversionPattern);

  for (let interval of modIntervals) {
    let v = Tone.Frequency(root + interval, "midi").toNote();
    pitchs.push(v);
  }

  Tone.start().then(() => {
    // Stop previous chord
    if (currentPitchs) {
      synth.triggerRelease(currentPitchs);
      clearTimeout(releaseTimeout);
    }
    // Start new chord
    synth.triggerAttack(pitchs);
    currentPitchs = pitchs;
    // Auto-release after 5 seconds
    releaseTimeout = setTimeout(() => {
      if (currentPitchs) {
        synth.triggerRelease(currentPitchs);
        currentPitchs = null;
      }
    }, 5000);
  }).catch((err) => console.log("Tone.start error:", err));
}

function toggleClass(el, className) {
    if (!el.classList.contains(className)) el.classList.add(className);
    else el.classList.remove(className);
}

// Live transpose
function funcRef() {
  setTranspose();
}
window.onhashchange = funcRef;

// Chord sequence number
var keys = {};
window.onkeyup = function (e) {
  keys[e.keyCode] = false;
};
window.onkeydown = function (e) {
  keys[e.keyCode] = true;
};
