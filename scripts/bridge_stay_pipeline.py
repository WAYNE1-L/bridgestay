"""
BridgeStay Pipeline V5.0 (Stealth Profile Mode)
===============================================
功能：
1. 使用本地 ChromeData 文件夹存储登录状态 (只需登录一次！)
2. 强力去除自动化特征，解决 "JSON 白屏" 问题
3. 批量读取 links.txt 并抓取
"""
from __future__ import annotations
import json
import os
import time
import random
from dataclasses import dataclass, asdict
from typing import Any, Dict, Optional

from dotenv import load_dotenv
from openai import OpenAI
from supabase import create_client, Client

# Load environment variables from .env file (if present)
load_dotenv()

# 爬虫依赖
try:
    from selenium import webdriver
    from selenium.webdriver.chrome.service import Service
    from webdriver_manager.chrome import ChromeDriverManager
    from selenium.webdriver.common.by import By
    SELENIUM_AVAILABLE = True
except ImportError:
    SELENIUM_AVAILABLE = False

# ==========================================
# 配置区域 — 所有 Key 从 .env 文件或环境变量读取
# 请复制 .env.example 为 .env 并填入真实值，切勿硬编码 Key
# ==========================================
OPENAI_KEY = os.getenv("OPENAI_API_KEY")
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_ANON_KEY")

@dataclass
class Listing:
    title: str
    price: int
    layout: str
    contact_info: Dict[str, Any]
    location_json: Dict[str, Any]
    raw_data: str
    luxury_score: Optional[int] = None
    image_url: Optional[str] = None
    source_link: Optional[str] = None

    def to_supabase_payload(self) -> Dict[str, Any]:
        payload = asdict(self)
        if payload["luxury_score"] is None: payload.pop("luxury_score")
        if payload["image_url"] is None: payload.pop("image_url")
        if payload["source_link"] is None: payload.pop("source_link")
        return payload

def extract_data(text: str) -> Listing:
    client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))
    system_prompt = "Extract into JSON: title, price(int), layout, contact_info, location_json, luxury_score(int), raw_data."
    try:
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "system", "content": system_prompt}, {"role": "user", "content": text}],
            response_format={"type": "json_object"}, temperature=0
        )
        data = json.loads(response.choices[0].message.content)
        return Listing(
            title=str(data.get("title", "Unknown")),
            price=int(data.get("price") or 0),
            layout=str(data.get("layout", "Unknown")),
            contact_info=data.get("contact_info", {}),
            location_json=data.get("location_json", {}),
            raw_data=text,
            luxury_score=data.get("luxury_score")
        )
    except Exception as e:
        print(f"❌ AI Error: {e}")
        return None

def save_to_db(listing: Listing):
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_ANON_KEY")
    supabase: Client = create_client(url, key)
    try:
        res = supabase.table("listings").insert(listing.to_supabase_payload()).execute()
        print(f"🎉 成功入库! ID: {res.data[0]['id']} | {listing.title[:15]}...")
    except Exception as e:
        print(f"❌ DB Error: {e}")

class Crawler:
    def __init__(self):
        print("🕵️ 正在启动隐身浏览器 (V5.0)...")
        options = webdriver.ChromeOptions()
        
        # 🟢 核心改动 1: 挂载本地数据目录 (让浏览器有记忆)
        current_dir = os.getcwd()
        data_dir = os.path.join(current_dir, "ChromeData")
        if not os.path.exists(data_dir):
            os.makedirs(data_dir) # 自动创建文件夹
        options.add_argument(f"--user-data-dir={data_dir}")
        
        # 🟢 核心改动 2: 强力移除自动化特征 (Anti-Detection)
        options.add_argument("--disable-blink-features=AutomationControlled")
        options.add_experimental_option("excludeSwitches", ["enable-automation"])
        options.add_experimental_option("useAutomationExtension", False)
        
        # 其他优化
        options.add_argument("--start-maximized") # 最大化窗口
        options.add_argument("user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36")

        self.driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=options)
        
        # 再次执行脚本去除 navigator.webdriver 标记
        self.driver.execute_cdp_cmd("Page.addScriptToEvaluateOnNewDocument", {
            "source": """
                Object.defineProperty(navigator, 'webdriver', {
                    get: () => undefined
                })
            """
        })

    def login_check(self):
        """检查登录状态"""
        print("\n" + "="*50)
        print("🚨 【身份验证】")
        print("1. 浏览器已打开。如果是第一次运行，请手动访问 xiaohongshu.com 并扫码登录。")
        print("2. 如果之前登录过，这里应该已经是登录状态了。")
        print("3. 确保你能看到正常的网页（不是白底黑字）。")
        print("="*50 + "\n")
        
        # 先去个安全的地方
        self.driver.get("https://www.xiaohongshu.com")
        
        input("👉 确认页面正常且已登录后，请按回车键开始批量任务...")
        print("🚀 验证通过！开始干活...")

    def fetch_page_content(self, url):
        print(f"\n🌐 访问: {url}")
        self.driver.get(url)
        
        sleep_time = random.uniform(4, 7) # 多睡会儿
        print(f"⏳ 模拟浏览中 ({sleep_time:.1f}s)...")
        time.sleep(sleep_time)
        
        # 尝试检测是否又被拦截了 (JSON 页面特征)
        body_text = self.driver.find_element(By.TAG_NAME, "body").text
        if '"code":' in body_text and '"success":' in body_text and len(body_text) < 500:
            print("⚠️ 警报：检测到 JSON 拦截页面！尝试刷新...")
            self.driver.refresh()
            time.sleep(5)
            body_text = self.driver.find_element(By.TAG_NAME, "body").text

        # 抓图
        found_img_url = None
        try:
            images = self.driver.find_elements(By.TAG_NAME, "img")
            for img in images:
                src = img.get_attribute("src")
                if src and "http" in src and len(src) > 50:
                    if "avatar" not in src.lower() and "profile" not in src.lower():
                        found_img_url = src
                        break 
            if not found_img_url and len(images) > 0: found_img_url = images[0].get_attribute("src")
        except: pass

        return body_text, found_img_url

if __name__ == "__main__":
    # 检查环境变量是否已加载
    if not OPENAI_KEY or not SUPABASE_URL or not SUPABASE_KEY:
        print("❌ 缺少必要的环境变量！请复制 .env.example 为 .env 并填入真实值。")
        print("   缺少: ", [k for k, v in {"OPENAI_API_KEY": OPENAI_KEY, "SUPABASE_URL": SUPABASE_URL, "SUPABASE_ANON_KEY": SUPABASE_KEY}.items() if not v])
        exit(1)

    # 检查弹药箱
    if not os.path.exists("links.txt"):
        print("❌ 找不到 links.txt！")
        exit()

    with open("links.txt", "r") as f:
        urls = [line.strip() for line in f.readlines() if line.strip().startswith("http")]

    if len(urls) > 0:
        bot = Crawler()
        bot.login_check() # 👈 智能检查登录

        for i, target_url in enumerate(urls):
            print(f"\n[任务 {i+1}/{len(urls)}]")
            try:
                raw_text, img_url = bot.fetch_page_content(target_url)
                
                if len(raw_text) > 100 and "code" not in raw_text[:50]:
                    listing = extract_data(raw_text)
                    if listing:
                        listing.image_url = img_url
                        listing.source_link = target_url
                        save_to_db(listing)
                else:
                    print("⚠️ 页面抓取失败（可能是被拦截），跳过此条。")
            except Exception as e:
                print(f"❌ 出错: {e}")
                
        print("\n🎉🎉🎉 搞定收工！")