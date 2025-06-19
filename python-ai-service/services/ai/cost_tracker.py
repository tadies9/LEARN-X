"""Cost tracking for AI services"""
import asyncio
from datetime import datetime, timedelta
from typing import Dict, Optional, List
from collections import defaultdict
from dataclasses import dataclass, field
import json

from structlog import get_logger
import aiofiles
from pathlib import Path


logger = get_logger()


@dataclass
class UsageRecord:
    """Record of AI usage"""
    user_id: str
    provider: str
    model: str
    prompt_tokens: int
    completion_tokens: int
    cost: float
    timestamp: datetime = field(default_factory=datetime.now)
    metadata: Optional[Dict] = None


class CostTracker:
    """Track costs and usage for AI services"""
    
    def __init__(self, persistence_path: Optional[Path] = None):
        self.persistence_path = persistence_path or Path("./data/cost_tracking.json")
        self.persistence_path.parent.mkdir(parents=True, exist_ok=True)
        
        # In-memory tracking
        self.usage_by_user: Dict[str, List[UsageRecord]] = defaultdict(list)
        self.usage_by_model: Dict[str, List[UsageRecord]] = defaultdict(list)
        self.usage_by_provider: Dict[str, List[UsageRecord]] = defaultdict(list)
        
        # Aggregated stats
        self.total_costs: Dict[str, float] = defaultdict(float)
        self.total_tokens: Dict[str, int] = defaultdict(int)
        
        # Lock for thread safety
        self._lock = asyncio.Lock()
        
        # Load existing data
        asyncio.create_task(self._load_data())
    
    async def track_usage(
        self,
        user_id: str,
        provider: str,
        model: str,
        prompt_tokens: int,
        completion_tokens: int,
        cost: float,
        metadata: Optional[Dict] = None
    ) -> None:
        """Track AI usage and costs"""
        async with self._lock:
            record = UsageRecord(
                user_id=user_id,
                provider=provider,
                model=model,
                prompt_tokens=prompt_tokens,
                completion_tokens=completion_tokens,
                cost=cost,
                metadata=metadata
            )
            
            # Add to tracking lists
            self.usage_by_user[user_id].append(record)
            self.usage_by_model[model].append(record)
            self.usage_by_provider[provider].append(record)
            
            # Update aggregates
            self.total_costs[user_id] += cost
            self.total_costs[f"model:{model}"] += cost
            self.total_costs[f"provider:{provider}"] += cost
            self.total_costs["total"] += cost
            
            self.total_tokens[user_id] += prompt_tokens + completion_tokens
            self.total_tokens[f"model:{model}"] += prompt_tokens + completion_tokens
            self.total_tokens[f"provider:{provider}"] += prompt_tokens + completion_tokens
            self.total_tokens["total"] += prompt_tokens + completion_tokens
            
            # Persist data periodically
            if len(self.usage_by_user[user_id]) % 10 == 0:
                asyncio.create_task(self._save_data())
            
            logger.debug(
                "Tracked AI usage",
                user_id=user_id,
                provider=provider,
                model=model,
                cost=cost,
                tokens=prompt_tokens + completion_tokens
            )
    
    async def get_user_stats(
        self,
        user_id: str,
        period: Optional[timedelta] = None
    ) -> Dict:
        """Get usage statistics for a user"""
        async with self._lock:
            records = self.usage_by_user.get(user_id, [])
            
            if period:
                cutoff = datetime.now() - period
                records = [r for r in records if r.timestamp >= cutoff]
            
            if not records:
                return {
                    "user_id": user_id,
                    "total_cost": 0,
                    "total_tokens": 0,
                    "request_count": 0,
                    "by_model": {},
                    "by_provider": {}
                }
            
            # Aggregate by model
            by_model = defaultdict(lambda: {
                "cost": 0, "tokens": 0, "requests": 0
            })
            for record in records:
                by_model[record.model]["cost"] += record.cost
                by_model[record.model]["tokens"] += (
                    record.prompt_tokens + record.completion_tokens
                )
                by_model[record.model]["requests"] += 1
            
            # Aggregate by provider
            by_provider = defaultdict(lambda: {
                "cost": 0, "tokens": 0, "requests": 0
            })
            for record in records:
                by_provider[record.provider]["cost"] += record.cost
                by_provider[record.provider]["tokens"] += (
                    record.prompt_tokens + record.completion_tokens
                )
                by_provider[record.provider]["requests"] += 1
            
            total_cost = sum(r.cost for r in records)
            total_tokens = sum(
                r.prompt_tokens + r.completion_tokens for r in records
            )
            
            return {
                "user_id": user_id,
                "total_cost": total_cost,
                "total_tokens": total_tokens,
                "request_count": len(records),
                "by_model": dict(by_model),
                "by_provider": dict(by_provider),
                "period": period.total_seconds() if period else None
            }
    
    async def get_model_stats(
        self,
        model: str,
        period: Optional[timedelta] = None
    ) -> Dict:
        """Get usage statistics for a model"""
        async with self._lock:
            records = self.usage_by_model.get(model, [])
            
            if period:
                cutoff = datetime.now() - period
                records = [r for r in records if r.timestamp >= cutoff]
            
            if not records:
                return {
                    "model": model,
                    "total_cost": 0,
                    "total_tokens": 0,
                    "request_count": 0,
                    "average_cost_per_request": 0,
                    "average_tokens_per_request": 0
                }
            
            total_cost = sum(r.cost for r in records)
            total_tokens = sum(
                r.prompt_tokens + r.completion_tokens for r in records
            )
            
            return {
                "model": model,
                "total_cost": total_cost,
                "total_tokens": total_tokens,
                "request_count": len(records),
                "average_cost_per_request": total_cost / len(records),
                "average_tokens_per_request": total_tokens / len(records),
                "period": period.total_seconds() if period else None
            }
    
    async def get_provider_stats(
        self,
        provider: str,
        period: Optional[timedelta] = None
    ) -> Dict:
        """Get usage statistics for a provider"""
        async with self._lock:
            records = self.usage_by_provider.get(provider, [])
            
            if period:
                cutoff = datetime.now() - period
                records = [r for r in records if r.timestamp >= cutoff]
            
            if not records:
                return {
                    "provider": provider,
                    "total_cost": 0,
                    "total_tokens": 0,
                    "request_count": 0,
                    "by_model": {}
                }
            
            # Aggregate by model
            by_model = defaultdict(lambda: {
                "cost": 0, "tokens": 0, "requests": 0
            })
            for record in records:
                by_model[record.model]["cost"] += record.cost
                by_model[record.model]["tokens"] += (
                    record.prompt_tokens + record.completion_tokens
                )
                by_model[record.model]["requests"] += 1
            
            total_cost = sum(r.cost for r in records)
            total_tokens = sum(
                r.prompt_tokens + r.completion_tokens for r in records
            )
            
            return {
                "provider": provider,
                "total_cost": total_cost,
                "total_tokens": total_tokens,
                "request_count": len(records),
                "by_model": dict(by_model),
                "period": period.total_seconds() if period else None
            }
    
    async def get_stats(self, period: Optional[timedelta] = None) -> Dict:
        """Get overall statistics"""
        async with self._lock:
            # Get all records
            all_records = []
            for records in self.usage_by_user.values():
                all_records.extend(records)
            
            if period:
                cutoff = datetime.now() - period
                all_records = [r for r in all_records if r.timestamp >= cutoff]
            
            if not all_records:
                return {
                    "total_cost": 0,
                    "total_tokens": 0,
                    "total_requests": 0,
                    "unique_users": 0,
                    "by_provider": {},
                    "by_model": {}
                }
            
            # Aggregate stats
            by_provider = defaultdict(lambda: {
                "cost": 0, "tokens": 0, "requests": 0
            })
            by_model = defaultdict(lambda: {
                "cost": 0, "tokens": 0, "requests": 0
            })
            unique_users = set()
            
            for record in all_records:
                unique_users.add(record.user_id)
                
                by_provider[record.provider]["cost"] += record.cost
                by_provider[record.provider]["tokens"] += (
                    record.prompt_tokens + record.completion_tokens
                )
                by_provider[record.provider]["requests"] += 1
                
                by_model[record.model]["cost"] += record.cost
                by_model[record.model]["tokens"] += (
                    record.prompt_tokens + record.completion_tokens
                )
                by_model[record.model]["requests"] += 1
            
            total_cost = sum(r.cost for r in all_records)
            total_tokens = sum(
                r.prompt_tokens + r.completion_tokens for r in all_records
            )
            
            return {
                "total_cost": total_cost,
                "total_tokens": total_tokens,
                "total_requests": len(all_records),
                "unique_users": len(unique_users),
                "by_provider": dict(by_provider),
                "by_model": dict(by_model),
                "period": period.total_seconds() if period else None
            }
    
    async def get_cost_breakdown(
        self,
        user_id: Optional[str] = None,
        group_by: str = "day",
        period: Optional[timedelta] = None
    ) -> List[Dict]:
        """Get cost breakdown over time"""
        async with self._lock:
            if user_id:
                records = self.usage_by_user.get(user_id, [])
            else:
                records = []
                for user_records in self.usage_by_user.values():
                    records.extend(user_records)
            
            if period:
                cutoff = datetime.now() - period
                records = [r for r in records if r.timestamp >= cutoff]
            
            if not records:
                return []
            
            # Group records by time period
            grouped = defaultdict(lambda: {
                "cost": 0, "tokens": 0, "requests": 0
            })
            
            for record in records:
                if group_by == "day":
                    key = record.timestamp.date().isoformat()
                elif group_by == "hour":
                    key = record.timestamp.strftime("%Y-%m-%d %H:00")
                elif group_by == "week":
                    key = record.timestamp.strftime("%Y-W%U")
                elif group_by == "month":
                    key = record.timestamp.strftime("%Y-%m")
                else:
                    key = record.timestamp.date().isoformat()
                
                grouped[key]["cost"] += record.cost
                grouped[key]["tokens"] += (
                    record.prompt_tokens + record.completion_tokens
                )
                grouped[key]["requests"] += 1
            
            # Convert to list
            breakdown = []
            for period_key, stats in sorted(grouped.items()):
                breakdown.append({
                    "period": period_key,
                    "cost": stats["cost"],
                    "tokens": stats["tokens"],
                    "requests": stats["requests"],
                    "average_cost_per_request": (
                        stats["cost"] / stats["requests"]
                        if stats["requests"] > 0 else 0
                    )
                })
            
            return breakdown
    
    async def _save_data(self) -> None:
        """Save tracking data to disk"""
        try:
            data = {
                "last_updated": datetime.now().isoformat(),
                "total_costs": dict(self.total_costs),
                "total_tokens": dict(self.total_tokens),
                "records": []
            }
            
            # Convert records to serializable format
            for user_id, records in self.usage_by_user.items():
                for record in records:
                    data["records"].append({
                        "user_id": record.user_id,
                        "provider": record.provider,
                        "model": record.model,
                        "prompt_tokens": record.prompt_tokens,
                        "completion_tokens": record.completion_tokens,
                        "cost": record.cost,
                        "timestamp": record.timestamp.isoformat(),
                        "metadata": record.metadata
                    })
            
            async with aiofiles.open(self.persistence_path, 'w') as f:
                await f.write(json.dumps(data, indent=2))
                
        except Exception as e:
            logger.error(f"Failed to save cost tracking data: {e}")
    
    async def _load_data(self) -> None:
        """Load tracking data from disk"""
        if not self.persistence_path.exists():
            return
        
        try:
            async with aiofiles.open(self.persistence_path, 'r') as f:
                data = json.loads(await f.read())
            
            # Restore aggregates
            self.total_costs = defaultdict(float, data.get("total_costs", {}))
            self.total_tokens = defaultdict(int, data.get("total_tokens", {}))
            
            # Restore records
            for record_data in data.get("records", []):
                record = UsageRecord(
                    user_id=record_data["user_id"],
                    provider=record_data["provider"],
                    model=record_data["model"],
                    prompt_tokens=record_data["prompt_tokens"],
                    completion_tokens=record_data["completion_tokens"],
                    cost=record_data["cost"],
                    timestamp=datetime.fromisoformat(record_data["timestamp"]),
                    metadata=record_data.get("metadata")
                )
                
                self.usage_by_user[record.user_id].append(record)
                self.usage_by_model[record.model].append(record)
                self.usage_by_provider[record.provider].append(record)
            
            logger.info(
                "Loaded cost tracking data",
                users=len(self.usage_by_user),
                total_records=sum(len(r) for r in self.usage_by_user.values())
            )
            
        except Exception as e:
            logger.error(f"Failed to load cost tracking data: {e}")