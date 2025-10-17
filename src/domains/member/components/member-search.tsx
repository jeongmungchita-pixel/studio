'use client';

import React, { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Member } from '@/types/member';
import { filterMembers, sortMembers, getMemberCategory } from '../utils';
import { Search, Filter, SortAsc, SortDesc, X } from 'lucide-react';

// ============================================
// 🔍 회원 검색 컴포넌트
// ============================================

interface MemberSearchProps {
  members: Member[];
  onFilteredMembersChange: (filteredMembers: Member[]) => void;
  placeholder?: string;
  showFilters?: boolean;
  showSort?: boolean;
  className?: string;
}

interface SearchFilters {
  status: 'all' | 'active' | 'inactive' | 'pending';
  category: 'all' | 'adult' | 'child';
  club: string;
}

interface SortOptions {
  field: 'name' | 'createdAt' | 'status' | 'age';
  direction: 'asc' | 'desc';
}

export function MemberSearch({
  members,
  onFilteredMembersChange,
  placeholder = "회원 이름, 이메일, 전화번호로 검색...",
  showFilters = true,
  showSort = true,
  className
}: MemberSearchProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<SearchFilters>({
    status: 'all',
    category: 'all',
    club: 'all'
  });
  const [sortOptions, setSortOptions] = useState<SortOptions>({
    field: 'name',
    direction: 'asc'
  });
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // 고유 클럽 목록 추출
  const uniqueClubs = useMemo(() => {
    const clubs = Array.from(new Set(members.map(m => m.clubName).filter(Boolean)));
    return clubs.sort();
  }, [members]);

  // 필터링 및 정렬된 회원 목록
  const filteredAndSortedMembers = useMemo(() => {
    let result = [...members];

    // 텍스트 검색
    if (searchTerm.trim()) {
      result = filterMembers(result, searchTerm);
    }

    // 상태 필터
    if (filters.status !== 'all') {
      result = result.filter(member => member.status === filters.status);
    }

    // 카테고리 필터
    if (filters.category !== 'all') {
      result = result.filter(member => getMemberCategory(member) === filters.category);
    }

    // 클럽 필터
    if (filters.club !== 'all') {
      result = result.filter(member => member.clubName === filters.club);
    }

    // 정렬
    result = sortMembers(result, sortOptions.field, sortOptions.direction);

    return result;
  }, [members, searchTerm, filters, sortOptions]);

  // 필터링된 결과를 부모 컴포넌트에 전달
  React.useEffect(() => {
    onFilteredMembersChange(filteredAndSortedMembers);
  }, [filteredAndSortedMembers, onFilteredMembersChange]);

  // 필터 초기화
  const clearFilters = () => {
    setSearchTerm('');
    setFilters({
      status: 'all',
      category: 'all',
      club: 'all'
    });
    setSortOptions({
      field: 'name',
      direction: 'asc'
    });
  };

  // 활성 필터 개수
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.status !== 'all') count++;
    if (filters.category !== 'all') count++;
    if (filters.club !== 'all') count++;
    return count;
  }, [filters]);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* 검색 입력 */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder={placeholder}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 pr-4"
        />
        {searchTerm && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
            onClick={() => setSearchTerm('')}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* 필터 및 정렬 컨트롤 */}
      <div className="flex items-center gap-2 flex-wrap">
        {showFilters && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className="gap-2"
          >
            <Filter className="h-4 w-4" />
            필터
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="ml-1 px-1.5 py-0.5 text-xs">
                {activeFiltersCount}
              </Badge>
            )}
          </Button>
        )}

        {showSort && (
          <div className="flex items-center gap-2">
            <Select
              value={sortOptions.field}
              onValueChange={(value) => 
                setSortOptions(prev => ({ ...prev, field: value as SortOptions['field'] }))
              }
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">이름</SelectItem>
                <SelectItem value="createdAt">등록일</SelectItem>
                <SelectItem value="status">상태</SelectItem>
                <SelectItem value="age">나이</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="sm"
              onClick={() => 
                setSortOptions(prev => ({ 
                  ...prev, 
                  direction: prev.direction === 'asc' ? 'desc' : 'asc' 
                }))
              }
            >
              {sortOptions.direction === 'asc' ? (
                <SortAsc className="h-4 w-4" />
              ) : (
                <SortDesc className="h-4 w-4" />
              )}
            </Button>
          </div>
        )}

        {(activeFiltersCount > 0 || searchTerm) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="gap-2"
          >
            <X className="h-4 w-4" />
            초기화
          </Button>
        )}

        {/* 결과 개수 */}
        <div className="text-sm text-muted-foreground ml-auto">
          {filteredAndSortedMembers.length}명 / 전체 {members.length}명
        </div>
      </div>

      {/* 고급 필터 */}
      {showAdvancedFilters && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
          <div>
            <label className="text-sm font-medium mb-2 block">상태</label>
            <Select
              value={filters.status}
              onValueChange={(value) => 
                setFilters(prev => ({ ...prev, status: value as SearchFilters['status'] }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                <SelectItem value="active">활동중</SelectItem>
                <SelectItem value="inactive">비활동</SelectItem>
                <SelectItem value="pending">승인대기</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">카테고리</label>
            <Select
              value={filters.category}
              onValueChange={(value) => 
                setFilters(prev => ({ ...prev, category: value as SearchFilters['category'] }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                <SelectItem value="adult">성인</SelectItem>
                <SelectItem value="child">아동</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">클럽</label>
            <Select
              value={filters.club}
              onValueChange={(value) => 
                setFilters(prev => ({ ...prev, club: value }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                {uniqueClubs.map(club => (
                  <SelectItem key={club} value={club}>
                    {club}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* 활성 필터 태그 */}
      {(activeFiltersCount > 0 || searchTerm) && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-muted-foreground">활성 필터:</span>
          
          {searchTerm && (
            <Badge variant="secondary" className="gap-1">
              검색: "{searchTerm}"
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => setSearchTerm('')}
              />
            </Badge>
          )}
          
          {filters.status !== 'all' && (
            <Badge variant="secondary" className="gap-1">
              상태: {filters.status}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => setFilters(prev => ({ ...prev, status: 'all' }))}
              />
            </Badge>
          )}
          
          {filters.category !== 'all' && (
            <Badge variant="secondary" className="gap-1">
              카테고리: {filters.category}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => setFilters(prev => ({ ...prev, category: 'all' }))}
              />
            </Badge>
          )}
          
          {filters.club !== 'all' && (
            <Badge variant="secondary" className="gap-1">
              클럽: {filters.club}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => setFilters(prev => ({ ...prev, club: 'all' }))}
              />
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
