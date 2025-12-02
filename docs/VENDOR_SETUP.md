# Vendor Setup Guide

This guide explains how to configure the supported vendors for Airtime, Data, and Bill payments.

## Overview

The system supports multiple vendors with automatic failover. You can configure one or more vendors by setting the appropriate environment variables in your `.env` file.

| Vendor | Priority | Services | Env Variables | Website |
|--------|----------|----------|---------------|---------|
| **Amigo** | 0 (Primary) | DATA | `AMIGO_API_TOKEN` | [amigo.ng](https://amigo.ng) |
| **VTU.ng** | 1 (Secondary) | AIRTIME, DATA, BILLS | `VTU_NG_USERNAME`, `VTU_NG_PASSWORD` | [vtu.ng](https://vtu.ng) |
| **eBills.Africa** | 2 (Fallback) | AIRTIME, DATA, BILLS | `EBILLS_USERNAME`, `EBILLS_PASSWORD` | [ebills.africa](https://ebills.africa) |
| **ClubKonnect** | 3 (Fallback) | AIRTIME, DATA | `CLUBKONNECT_USER_ID`, `CLUBKONNECT_API_KEY` | [clubkonnect.com](https://www.clubkonnect.com) |

## 1. Amigo (Data Only)

Amigo is the primary vendor for Data bundles due to its reliability and pricing.

**Setup:**
1.  Register at [https://amigo.ng](https://amigo.ng).
2.  Go to **API Settings** or **Developer** section.
3.  Copy your **API Token**.
4.  Add to `.env`:
    ```env
    AMIGO_API_TOKEN=your_amigo_token_here
    ```

## 2. VTU.ng (Airtime & Bills)

VTU.ng is the primary vendor for Airtime and Bill payments (Electricity, Cable TV).

**Setup:**
1.  Register at [https://vtu.ng](https://vtu.ng).
2.  Your API credentials are simply your **Login Username** and **Login Password**.
3.  Add to `.env`:
    ```env
    VTU_NG_USERNAME=your_username
    VTU_NG_PASSWORD=your_password
    ```

## 3. eBills.Africa (Fallback)

eBills.Africa is a reliable fallback for Airtime and Bills. It uses the same API structure as VTU.ng.

**Setup:**
1.  Register at [https://ebills.africa](https://ebills.africa).
2.  Your API credentials are your **Login Username** and **Login Password**.
3.  Add to `.env`:
    ```env
    EBILLS_USERNAME=your_username
    EBILLS_PASSWORD=your_password
    ```

## 4. ClubKonnect (Fallback)

ClubKonnect is another fallback option, primarily for Airtime and Data.

**Setup:**
1.  Register at [https://www.clubkonnect.com](https://www.clubkonnect.com) (or [https://www.nellobytesystems.com](https://www.nellobytesystems.com)).
2.  Go to **API Integration**.
3.  Copy your **User ID** and **API Key**.
4.  Add to `.env`:
    ```env
    CLUBKONNECT_USER_ID=your_user_id
    CLUBKONNECT_API_KEY=your_api_key
    ```

## Troubleshooting

### "No vendors available for service: AIRTIME"
This error occurs when no vendor capable of handling Airtime is configured.
**Fix:** Configure at least one of **VTU.ng**, **eBills.Africa**, or **ClubKonnect** in your `.env` file.

### "No vendors available for service: DATA"
**Fix:** Configure **Amigo** (recommended) or any of the other vendors.

### Testing
After updating your `.env` file, restart the server:
```bash
npm run dev
# or
npm start
```
