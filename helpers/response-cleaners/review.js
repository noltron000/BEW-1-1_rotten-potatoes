const {
	convertToCertification,
	convertToEasyDate,
	convertToEasyDuration,
	convertToStarGrade,
	convertToVulgarFraction,
} = require('../data-parser.js')



const cleanOpinions = (reviews = null) => {
	if (reviews === null) {
		return {
			'ratings': {
				'count': 0,
				'total': 0,
				'average': null,
				'vulgar_average': null,
				'histogram_count': 0,
				'histogram': {
					'0': 0,
					'1': 0,
					'2': 0,
					'3': 0,
					'4': 0,
					'5': 0,
				},
			},
			'reviews': {
				'count': 0,
				'entries': [],
			},
		}
	}

	// initialize an empty opinions object.
	const opinions = cleanOpinions(null)

	const fromDb = ( ) => {
		// clean all of the reviews.
		const dbReviews = reviews.map(review => cleanReview(review).fromDb( ))

		// add ratings to cleaned opinions object.
		// gather and consider only reviews with a rating.
		dbReviews
		.filter(review => Number.isFinite(review.rating))
		.forEach(review => {
			opinions.ratings.count += 1
			opinions.ratings.histogram_count += 1
			opinions.ratings.histogram[review.rating] += 1
			opinions.ratings.total += review.rating
		})

		// calculated rating attributes
		opinions.ratings.average = opinions.ratings.total / opinions.ratings.count
		opinions.ratings.vulgar_average = convertToVulgarFraction(opinions.ratings.average)

		// add dbReviews to cleaned opinions object.
		// gather and consider only dbReviews with content.
		dbReviews
		.filter(review => review.content)
		.forEach(review => {
			opinions.reviews.count += 1
			opinions.reviews.entries.push(review)
		})

		return opinions
	}

	const fromApi = (apiMovie) => {
		// clean all of the reviews.
		const apiReviews = reviews.map(review => cleanReview(review).fromApi( ))

		// add ratings to cleaned opinions object.
		// gather and consider only reviews with a rating.
		apiReviews
		.filter(review => Number.isFinite(review.rating))
		.forEach(review => {
			opinions.ratings.histogram_count += 1
			opinions.ratings.histogram[review.rating] += 1
		})

		// add ratings based on the movie api response.
		opinions.ratings.count += apiMovie.vote_count
		opinions.ratings.total += apiMovie.vote_count * convertToStarGrade(apiMovie.vote_average)

		// calculated rating attributes
		opinions.ratings.average = opinions.ratings.total / opinions.ratings.count
		opinions.ratings.vulgar_average = convertToVulgarFraction(opinions.ratings.average)

		// add apiReviews to cleaned opinions object.
		// gather and consider only apiReviews with content.
		apiReviews
		.filter(review => review.content)
		.forEach(review => {
			opinions.reviews.count += 1
			opinions.reviews.entries.push(review)
		})

		return opinions
	}

	return {
		fromDb,
		fromApi,
	}
}


const mergeOpinions = (opinions, moreOpinions) => {
	// merge ratings together
	opinions.ratings.count += moreOpinions.ratings.count
	opinions.ratings.total += moreOpinions.ratings.total
	opinions.ratings.histogram_count += moreOpinions.ratings.histogram_count

	// merge ratings histogram
	Object.keys(opinions.ratings.histogram)
	.forEach(rating => {
		opinions.ratings.histogram[rating] += moreOpinions.ratings.histogram[rating]
	})

	// calculated rating attributes
	opinions.ratings.average = opinions.ratings.total / opinions.ratings.count
	opinions.ratings.vulgar_average = convertToVulgarFraction(opinions.ratings.average)

	// merge reviews together
	opinions.reviews.count += moreOpinions.reviews.count
	opinions.reviews.entries.push(...moreOpinions.reviews.entries)

	return opinions
}


const cleanReview = (review = null) => {
	if (review === null) {
		return {
			'source': null,
			'title': null,
			'content': null,
			'rating': null,
			'author': { },
			'comments': { },
			'creation_date': { },
			'revision_date': { },
		}
	}

	const fromDb = ( ) => {
		review.source = 'db'
		return review
	}

	const fromApi = ( ) => {
		var apiReview = review
		review = cleanReview(null)

		// rating information
		if (Number.isFinite(apiReview.author_details.rating)) {
			review.rating = Math.round(convertToStarGrade(apiReview.author_details.rating))
		}

		// review information
		review.source  = 'api'
		review.title = apiReview.title
		review.content = apiReview.content

		// determine date-time objects
		const creationObject = new Date(Date.parse(apiReview.created_at))
		const revisionObject = new Date(Date.parse(apiReview.updated_at))
		review.creation_date = convertToEasyDate(creationObject)
		review.revision_date = convertToEasyDate(revisionObject)

		// author information
		review.author.name = apiReview.author_details.name
		review.author.username = apiReview.author_details.username
		review.author.avatar_path = apiReview.author_details.avatar_path

		return review
	}

	return {fromDb, fromApi}
}


module.exports = {
	cleanReview,
	cleanOpinions,
	mergeOpinions,
}