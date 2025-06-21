from app.tools.facebook.accounts import get_facebook_business_accounts, get_facebook_ad_accounts
from app.tools.facebook.ad_creatives import fetch_existing_creatives, \
    delete_facebook_ad_creative, start_creative_creation
from app.tools.facebook.ad_sets import fetch_ad_sets, create_ad_set, delete_facebook_ad_set
from app.tools.facebook.campaigns import get_facebook_campaigns, create_fb_campaign, delete_facebook_campaign
from app.tools.facebook.catalog_creative import create_catalog_creative
from app.tools.facebook.catalogs import get_facebook_catalogs, create_facebook_catalog, delete_facebook_catalog
from app.tools.facebook.facebook_ad import create_facebook_ad, get_facebook_ads, delete_facebook_ad
from app.tools.facebook.pages import fetch_facebook_page_ids
from app.tools.facebook.products import fetch_products_from_catalog, delete_catalog_product, \
    start_catalog_product_creation
from app.tools.facebook.utils import search_interests, get_behavior_ids


declared_tool_list=[
    get_facebook_business_accounts,
    get_facebook_ad_accounts,
    get_facebook_catalogs,
    fetch_products_from_catalog,
    get_facebook_campaigns,
    fetch_ad_sets,
    create_fb_campaign,
    create_facebook_catalog,
    delete_catalog_product,
    start_catalog_product_creation,
    search_interests,
    get_behavior_ids,
    create_ad_set,

    start_creative_creation,
    create_catalog_creative,
    fetch_existing_creatives,
    create_facebook_ad,
    get_facebook_ads,
    fetch_facebook_page_ids,

    delete_facebook_catalog, ##new
    delete_facebook_campaign,
    delete_facebook_ad_set,
    delete_facebook_ad_creative,
    delete_facebook_ad
]