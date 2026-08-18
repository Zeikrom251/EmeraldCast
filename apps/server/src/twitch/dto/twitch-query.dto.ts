import { IsString, MinLength, MaxLength, IsOptional } from 'class-validator'

export class SearchQueryDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  q!: string
}

export class CategorySearchQueryDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  q!: string
}

export class StreamStatusQueryDto {
  /**
   * Comma-separated Twitch logins. The service sanitises and caps the list, so
   * this only needs to bound the raw string — 100 logins of 25 characters plus
   * separators fits comfortably under 2600.
   */
  @IsString()
  @MinLength(1)
  @MaxLength(2600)
  logins!: string
}

export class CategoryStreamsQueryDto {
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  gameId!: string

  @IsOptional()
  @IsString()
  @MaxLength(500)
  cursor?: string

  // ISO 639-1 language code (e.g. "en", "fr"). Omitted means all languages.
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(8)
  language?: string
}
