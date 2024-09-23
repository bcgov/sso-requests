/**
 * Handy utilities for the app
 */
import crypto from 'crypto';
import padStart from 'lodash.padstart';

class Utilities {
  runOk(data: any): boolean {
    if (data.disable) {
      return false;
    }

    const isLocalTest = Cypress.env('localtest');
    const isSmokeTest = Cypress.env('smoketest');
    // Directly return the evaluation based on conditions
    if (!isLocalTest && !isSmokeTest) {
      // If neither localtest nor smoketest is set, always return true
      return true;
    } else if (isLocalTest && isSmokeTest) {
      // If both flags are set, check corresponding data properties
      return data.localtest && data.smoketest;
    } else if (isLocalTest) {
      // If only localtest is set, check the localtest data property
      return data.localtest;
    } else if (isSmokeTest) {
      // If only smoketest is set, check the smoketest data property
      return data.smoketest;
    }

    // Default return should never be reached due to logic above covering all cases,
    // but it's good practice to have a fallback return in case the function logic evolves.
    return false;
  }
  md5(data: string): string {
    return crypto.createHash('md5').update(data).digest('hex');
  }
  getDate(): string {
    let today = new Date();
    let dd = padStart(String(today.getDate()), 2, '0');
    let mm = padStart(String(today.getMonth()) + 1, 2, '0'); //January is 0!
    let yyyy = padStart(String(today.getFullYear()), 4, '0');
    let hh = padStart(String(today.getHours()), 2, '0');
    let min = padStart(String(today.getMinutes()), 2, '0');
    let ss = padStart(String(today.getSeconds()), 2, '0');
    let ms = padStart(String(today.getMilliseconds()), 3, '0');
    return yyyy + mm + dd + hh + min + ss + ms;
  }
  getRandomInt(min: number, max: number) {
    const minCeiled = Math.ceil(min);
    const maxFloored = Math.floor(max);
    return Math.floor(Math.random() * (maxFloored - minCeiled) + minCeiled); // The maximum is exclusive and the minimum is inclusive
  }

  getKeyByValue(map: { [key: string]: string }, searchValue: string): string | undefined {
    for (const [key, value] of Object.entries(map)) {
      if (value === searchValue) {
        return key;
      }
    }
    return undefined; // or return a default value or handle the case when the value is not found
  }
}
export default Utilities;
