/* ═══════════════════════════════════════════════════════════════
   load-data.js – Data loading & parsing utilities
   COS30045 Data Visualisation Project
   ═══════════════════════════════════════════════════════════════ */

/**
 * Row conversion function for d3.csv().
 *
 * Parses each row of the hospitalisation CSV, coercing numeric
 * columns with the unary-plus operator so D3 scales receive
 * proper Number values instead of strings.
 *
 * @param {Object} d  Raw row object produced by d3.csv
 * @returns {Object}  Parsed row with typed values
 */
function rowConverter(d) {
  return {
    year:            +d.year,                   // e.g. 2021
    state:            d.state,                  // e.g. "VIC"
    injurySeverity:   d.injury_severity,        // e.g. "serious"
    hospitalisations: +d.hospitalisations,      // e.g. 4520
  };
}

/**
 * Load the hospitalisation CSV and return the parsed dataset.
 *
 * Usage:
 *   loadHospitalisationData().then(data => { … });
 *
 * @param {string} [path="data/sample_hospitalisation_data.csv"]
 *   Path to the CSV file (relative to index.html).
 * @returns {Promise<Array<Object>>}  Resolves with an array of
 *   row objects whose numeric fields are already coerced.
 */
function loadHospitalisationData(path) {
  const csvPath = path || 'data/sample_hospitalisation_data.csv';

  return d3.csv(csvPath, rowConverter)
    .catch(function (error) {
      console.error(`[load-data] Failed to load "${csvPath}":`, error);
      throw error;
    });
}
